export type Option<T> = SomeImpl<T> | NoneImpl;

export class SomeImpl<T> {
  readonly isSome = true;
  readonly isNone = false;

  constructor(public readonly value: T) {}

  public unwrap(): T {
    return this.value;
  }

  public unwrapOr(_fallback: T): T {
    return this.value;
  }

  public map<U>(fn: (val: T) => U): Option<U> {
    return Some(fn(this.value));
  }

  public match<R>(patterns: { Some: (val: T) => R; None: () => R }): R {
    return patterns.Some(this.value);
  }
}

export class NoneImpl {
  readonly isSome = false;
  readonly isNone = true;

  public unwrap(): never {
    throw new Error("[Option] Called unwrap() on None");
  }

  public unwrapOr<T>(fallback: T): T {
    return fallback;
  }

  public map<U>(_fn: (val: any) => U): Option<U> {
    return NONE;
  }

  public match<R>(patterns: { Some: (val: any) => R; None: () => R }): R {
    return patterns.None();
  }
}

export const NONE = new NoneImpl();

export function Some<T>(val: T): SomeImpl<T> {
  return new SomeImpl(val);
}

export function None(): NoneImpl {
  return NONE;
}
