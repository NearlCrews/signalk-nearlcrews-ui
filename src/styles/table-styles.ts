import type { StyleModule } from "./install.js";
import { TABLE_STYLES as DATA_GRID_SHEET } from "./table.js";

/** Data-grid styles, installed by `DataGrid` through `useModuleStyles`. */
export const TABLE_STYLES: StyleModule = {
  id: "table",
  styles: DATA_GRID_SHEET,
};
