import "server-only";
import { cache } from "react";
import { db } from "./db";

export const SETTING_SHOW_DEMO = "showDemoData";

/** Whether DEMO records are visible publicly. Defaults to true until production data exists. */
export const showDemoData = cache(async (): Promise<boolean> => {
  const row = await db.siteSetting.findUnique({ where: { key: SETTING_SHOW_DEMO } });
  return row ? row.value === true : true;
});
