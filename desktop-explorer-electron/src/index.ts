import { start as startGui } from "./gui";
import { startNode } from "p2p-network-tools-node-nodejs";

startGui(startNode());
