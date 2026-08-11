import type * as GraphTypes from "@microsoft/microsoft-graph-types";

export type Groups = {
  count: number;
  value: GraphTypes.Group[];
};

export type Users = {
  "@odata.nextLink"?: string | undefined;
  count: number;
  value: GraphTypes.User[];
};
