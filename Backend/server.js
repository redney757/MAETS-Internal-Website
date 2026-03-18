import app from "./App.js";

import fs from "fs";
import https from "https";
const PORT = 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});