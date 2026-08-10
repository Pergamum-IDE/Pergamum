import type { PergamumApi } from "../shared/api";

declare global {
  interface Window {
    pergamum: PergamumApi;
  }
}

export {};
