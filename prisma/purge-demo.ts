/** Removes every DEMO-flagged record. Reference data is kept.  npm run db:purge-demo */
import { PrismaClient } from "@prisma/client";
import { purgeDemoData } from "../src/lib/demo";

const db = new PrismaClient();

purgeDemoData(db)
  .then((counts) => console.log("Purged demo data:", counts))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
