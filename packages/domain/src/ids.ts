declare const brand: unique symbol;

export type Brand<TValue, TBrand extends string> = TValue & {
  readonly [brand]: TBrand;
};

export type UserId = Brand<string, "UserId">;
export type LifeEventId = Brand<string, "LifeEventId">;
export type CaptureId = Brand<string, "CaptureId">;
export type CaptureInterpretationId = Brand<string, "CaptureInterpretationId">;
export type DirectionId = Brand<string, "DirectionId">;
export type SeasonId = Brand<string, "SeasonId">;
export type OutcomeId = Brand<string, "OutcomeId">;
export type ProjectId = Brand<string, "ProjectId">;
export type ActionId = Brand<string, "ActionId">;
export type IncubatorItemId = Brand<string, "IncubatorItemId">;
export type RecommendationId = Brand<string, "RecommendationId">;
export type RecommendationEvidenceId = Brand<string, "RecommendationEvidenceId">;
