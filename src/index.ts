/**
 * TypeScript port of google/data-layer-helper
 * A helper that processes and monitors a dataLayer array.
 *
 * @author David Vallejo (https://github.com/thyngster)
 * @copyright Analytics Debugger S.L.U.
 *
 * The dataLayer is a shared queue of plain objects. This helper:
 * - Maintains an internal "model" by deep-merging each pushed object
 * - Calls a listener on every push with the merged model and the message
 * - Supports a command API (e.g. pushing ['set', 'key', value])
 * - Supports custom command processors via registerProcessor
 * - Handles re-entrant pushes (listener triggers another push)
 */

import type { PlainObject } from "./helpers";
import { typeOf, isArray, isPlainObject, expandKeyValue, merge } from "./helpers";

// ---------------------------------------------------------------------------
// DataLayerHelper
// ---------------------------------------------------------------------------

export interface DataLayerHelperOptions {
  /** Name identifying this dataLayer (passed to the listener). Default: 'dataLayer' */
  dataLayerName?: string;
  /** Process existing entries in the dataLayer on construction. Default: true */
  processNow?: boolean;
  /** Listener called on every push */
  listener?: (model: Record<string, unknown>, message: unknown, dataLayerName: string) => void;
}

export default class DataLayerHelper {
  private model_: PlainObject = {};
  private name_!: string;
  private listener_!: DataLayerHelperOptions["listener"] | null;
  private dataLayer_!: unknown[];
  private unprocessed_: unknown[] = [];
  private executingListener_: boolean = false;
  private processors_: Record<string, ((...args: unknown[]) => void)[]> = {};
  private originalPush_!: (...items: unknown[]) => number;
  private abstractModelInterface_!: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
  };

  constructor(dataLayer: unknown, options: DataLayerHelperOptions = {}) {
    if (!Array.isArray(dataLayer)) {
      throw new Error("dataLayer must be an array");
    }
    const { dataLayerName = "dataLayer", processNow = true, listener } = options;
    this.name_ = dataLayerName;
    this.dataLayer_ = dataLayer;
    this.listener_ = listener ?? null;
    this.abstractModelInterface_ = {
      set: (key: string, value: unknown) => {
        merge(expandKeyValue(key, value), this.model_);
      },
      get: (key: string) => this.get(key),
    };

    // Override push on the dataLayer
    this.originalPush_ = dataLayer.push.bind(dataLayer);
    dataLayer.push = (...args: unknown[]): number => {
      const result = this.originalPush_(...args);
      this.processStates_(args);
      return result;
    };

    // Register the built-in 'set' command
    this.registerProcessor("set", (key: unknown, value: unknown) => {
      if (typeof key === "string") {
        merge(expandKeyValue(key, value), this.model_);
      }
    });

    // Process existing entries
    if (processNow) {
      this.process();
    }
  }

  /**
   * Returns a value from the internal model by dot-notation key.
   * e.g. helper.get('user.name')
   */
  get(key: string): unknown {
    let target: unknown = this.model_;
    const parts = key.split(".");
    for (const part of parts) {
      if (target == null || typeof target !== "object") return undefined;
      target = (target as PlainObject)[part];
    }
    return target;
  }

  /**
   * Flattens the entire dataLayer history into a single merged object
   * (does not use the internal model).
   */
  flatten(): PlainObject {
    const result: PlainObject = {};
    for (const state of this.dataLayer_) {
      if (isPlainObject(state)) {
        merge(state, result);
      }
    }
    return result;
  }

  /**
   * Processes existing dataLayer entries.
   */
  process(): void {
    const states = this.dataLayer_.slice(0);
    this.processStates_(states);
  }

  /**
   * Registers a command processor. When an array is pushed whose first
   * element matches the command name, the processor is called with the
   * remaining elements as arguments.
   *
   * e.g. helper.registerProcessor('event', (name, params) => { ... })
   *      dataLayer.push(['event', 'click', { category: 'nav' }])
   */
  registerProcessor(name: string, processor: (...args: unknown[]) => void): void {
    if (!this.processors_[name]) {
      this.processors_[name] = [];
    }
    this.processors_[name].push(processor);
  }

  /**
   * Processes an array of states (pushed items). Each state can be:
   * - A plain object: merged into the model, listener called
   * - An array (command): first element is the command name
   * - A function: called with the model
   * - Arguments object: treated like an array
   */
  private processStates_(states: unknown[]): void {
    // Queue states if we're already processing (re-entrancy protection)
    if (this.executingListener_) {
      this.unprocessed_.push(...states);
      return;
    }

    for (const state of states) {
      this.processState_(state);
    }

    // Drain any re-entrant pushes
    while (this.unprocessed_.length > 0) {
      const queued = this.unprocessed_.splice(0);
      for (const state of queued) {
        this.processState_(state);
      }
    }
  }

  private processState_(state: unknown): void {
    if (typeof state === "function") {
      try {
        state.call(this.abstractModelInterface_);
      } catch {
        // Swallow errors from user functions
      }
    } else if (isArray(state) || typeOf(state) === "arguments") {
      this.processCommand_(state as unknown[]);
    } else if (isPlainObject(state)) {
      merge(state, this.model_);
    } else {
      return;
    }

    this.executingListener_ = true;
    try {
      this.listener_?.(this.model_, state, this.name_);
    } catch {
      // Swallow listener errors
    }
    this.executingListener_ = false;
  }

  private processCommand_(command: unknown[]): void {
    const name = command[0];
    if (typeof name !== "string") return;

    const processors = this.processors_[name];
    if (!processors) return;

    const args = command.slice(1);
    for (const processor of processors) {
      try {
        processor(...args);
      } catch {
        // Swallow processor errors
      }
    }
  }
}
