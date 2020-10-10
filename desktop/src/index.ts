import { startGui } from "./gui/gui";
import { startNode } from "./node/node";
import { sha256 } from "./lib/sha256";

startGui(startNode(sha256));
