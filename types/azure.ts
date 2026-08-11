import type { Groups } from "../scripts/db-update/types/graph.js";
import type {
  AzureRiskyUserSystemDataObject,
  AzureUserAuthenticationMethodSystemDataObject,
  AzureUserDeviceSystemDataObject,
  AzureUserSignInSystemDataObject,
  AzureUserSystemDataObject
} from "./system-data.js";

export type AzureDataWrapper<T> = {
  count: number;
  value: T;
};

export type AzureErrorResponse = {
  error: {
    code: number | null;
    message: string | null;
  };
};

export type BatchRequest = {
  requests: {
    id: string;
    method: "GET";
    url: string;
  }[];
};

export type BatchRequestResponseType =
  | {
      id: "1";
      status: number;
      body: AzureUserSystemDataObject | AzureErrorResponse;
    }
  | {
      id: "2";
      status: number;
      body: Groups | AzureErrorResponse;
    }
  | {
      id: "3";
      status: number;
      body: AzureDataWrapper<AzureUserAuthenticationMethodSystemDataObject[]> | AzureErrorResponse;
    }
  | {
      id: "4";
      status: number;
      body: AzureDataWrapper<AzureUserSignInSystemDataObject[]> | AzureErrorResponse;
    }
  | {
      id: "5";
      status: number;
      body: AzureDataWrapper<AzureUserSignInSystemDataObject[]> | AzureErrorResponse;
    }
  | {
      id: "6";
      status: number;
      body: AzureDataWrapper<AzureRiskyUserSystemDataObject[]> | AzureErrorResponse;
    }
  | {
      id: "7";
      status: number;
      body: AzureDataWrapper<AzureUserDeviceSystemDataObject[]> | AzureErrorResponse;
    };

export type BatchRequestResponse = {
  responses: BatchRequestResponseType[];
};

export type License = {
  skuId: string;
  skuPartNumber: string;
  name: string;
};
