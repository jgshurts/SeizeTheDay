import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`Sieze the Day API listening on port ${PORT}`);
});
