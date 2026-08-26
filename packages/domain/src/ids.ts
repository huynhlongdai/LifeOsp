declare const brand: unique symbol;

export type Brand<TValue, TBrand extends string> = TValue & {
  readonly [brand]: TBrand;
};

export type UserId = Brand<string, "UserId">;
export type LifeEventId = Brand<string, "LifeEventId">;
