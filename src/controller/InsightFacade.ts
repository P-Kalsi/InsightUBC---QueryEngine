import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import * as parse5 from "parse5";
import * as http from "http";
import Decimal from "decimal.js";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

/**
 * AI Declaration
 * AI was used on the helper functions, as well as addDataset to remove redundancy and cleaner code.
 * AI was also used to help with listDataset.
 * AI was used to help with helper functions for extractRoomsFromZip to remove redundancy and cleaner code.
 * AI was used to help troubleshoot no room tables being found
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, any[]> = new Map();
	private dataDir = path.resolve("./data");

	constructor() {
		void fs.ensureDir(this.dataDir);
	}

	// Helpers
	private validId(id: string): boolean {
		if (id === null || id === undefined) return false;
		if (/^\s*$/.test(id)) return false;
		if (id.includes("_")) return false;
		return true;
	}

	private validSection(sec: any): boolean {
		const required = ["Subject", "Course", "Avg", "Professor", "Title", "Pass", "Fail", "Audit", "id", "Year"];
		return required.every((k) => Object.prototype.hasOwnProperty.call(sec, k));
	}

	private transformSection(sec: any): any {
		return {
			dept: sec.Subject,
			id: sec.Course,
			avg: sec.Avg,
			instructor: sec.Professor,
			title: sec.Title,
			pass: sec.Pass,
			fail: sec.Fail,
			audit: sec.Audit,
			uuid: String(sec.id),
			year: sec.Section === "overall" ? 1900 : Number(sec.Year),
		};
	}

	private async extractSectionsFromZip(content: string): Promise<any[]> {
		let zip: JSZip;
		try {
			zip = await JSZip.loadAsync(content, { base64: true });
		} catch {
			throw new InsightError("Invalid ZIP");
		}

		const sections: any[] = [];
		const files = Object.keys(zip.files).filter((n) => n.startsWith("courses/") && !zip.files[n].dir);
		if (files.length === 0) {
			throw new InsightError("No course files found in ZIP");
		}

		for (const file of files) {
			try {
				const text = await zip.file(file)?.async("text");
				if (!text) continue;
				const json = JSON.parse(text);
				if (!json.result || !Array.isArray(json.result)) continue;

				for (const sec of json.result) {
					if (this.validSection(sec)) {
						sections.push(this.transformSection(sec));
					}
				}
			} catch {
				// skip
			}
		}

		if (sections.length === 0) {
			throw new InsightError("No valid sections found in dataset");
		}
		return sections;
	}
	private async extractRoomsFromZip(content: string): Promise<any[]> {
		let zip: JSZip;
		try {
			zip = await JSZip.loadAsync(content, { base64: true });
		} catch {
			throw new InsightError("Invalid ZIP");
		}

		const indexFile = zip.file("index.htm");
		if (!indexFile) throw new InsightError("index.htm is missing");

		const indexHTML = await indexFile.async("text");
		const document = parse5.parse(indexHTML);

		const buildingRows = this.findBuildingRows(document);
		const buildings = buildingRows
			.map((r) => this.parseBuildingRow(r))
			.filter((b) => b.shortname && b.href && b.address);

		const rooms: any[] = [];
		for (const building of buildings) {
			const bRooms = await this.extractRoomsFromBuilding(zip, building);
			rooms.push(...bRooms);
		}

		if (rooms.length === 0) throw new InsightError("No valid rooms");
		return rooms;
	}

	// Helper functions for extract rooms from zip
	private getText(node: any): string {
		if (!node.childNodes) return "";
		let text = "";
		for (const child of node.childNodes) {
			if (child.nodeName === "#text") text += child.value;
			else text += this.getText(child);
		}
		return text.trim();
	}

	private findChildren(node: any, tagName: string): any[] {
		const matches: any[] = [];
		if (!node || !node.childNodes) return [];
		for (const child of node.childNodes) {
			if (child.nodeName === tagName) matches.push(child);
			// AI Helped me figure out I need to search recursively and how
			matches.push(...this.findChildren(child, tagName));
		}
		return matches;
	}

	private findChild(node: any, tagName: string): any | undefined {
		if (!node || !node.childNodes) return undefined;
		for (const child of node.childNodes) {
			if (child.nodeName === tagName) return child;
		}
		return undefined;
	}

	private getParentRow(node: any): any {
		if (!node || !node.parentNode) return undefined;
		if (node.parentNode.nodeName === "tr") return node.parentNode;
		return this.getParentRow(node.parentNode);
	}

	// Got help from AI to fix issue of no room tables being found
	private findRoomTable(document: any): any | null {
		const stack: any[] = [document];
		if (!document) return null;
		while (stack.length > 0) {
			const node = stack.pop();
			if (node.nodeName === "table") {
				let tableClass = "";
				for (const attr of node.attrs) {
					if (attr.name === "class") {
						tableClass = attr.value;
						break;
					}
				}
				if (tableClass.includes("views-table")) {
					const tableCells = this.findChildren(node, "td").concat(this.findChildren(node, "th"));
					for (const cell of tableCells) {
						if (!cell.attrs) continue;

						let cellClass = "";
						for (const attr of cell.attrs) {
							if (attr.name === "class") {
								cellClass = attr.value;
								break;
							}
						}
						if (cellClass.includes("views-field-field-room-number")) return node;
					}
				}
			}
			if (node.childNodes && node.childNodes.length > 0) {
				for (const child of node.childNodes) {
					stack.push(child);
				}
			}
		}
		return null;
	}

	private async getGeo(address: string): Promise<{ lat: number; lon: number } | null> {
		return new Promise((resolve) => {
			const encoded = encodeURIComponent(address);
			const team = "173";
			const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${team}/${encoded}`;
			http
				.get(url, (res) => {
					let data = "";
					res.on("data", (chunk) => (data += chunk));
					res.on("end", () => {
						try {
							const json = JSON.parse(data);
							if (json.error) resolve(null);
							else resolve({ lat: json.lat, lon: json.lon });
						} catch {
							resolve(null);
						}
					});
				})
				.on("error", () => resolve(null));
		});
	}

	private findBuildingRows(document: any): any[] {
		const rows: any[] = [];

		const traverse = (node: any) => {
			if (!node || !node.childNodes) return;
			for (const child of node.childNodes) {
				if (child.nodeName === "td" && child.attrs) {
					let classString = "";
					for (const attr of child.attrs) {
						if (attr.name === "class") {
							classString = attr.value;
							break;
						}
					}
					if (classString.includes("views-field-field-building-address")) {
						const row = this.getParentRow(child);
						if (row) rows.push(row);
					}
				}
				traverse(child);
			}
		};
		traverse(document);

		return rows;
	}

	private parseBuildingRow(row: any): { fullname: string; shortname: string; address: string; href: string } {
		const building: any = { fullname: "", shortname: "", address: "", href: "" };
		const cells = this.findChildren(row, "td");

		for (const cell of cells) {
			let classString = "";
			for (const attr of cell.attrs) {
				if (attr.name === "class") {
					classString = attr.value;
					break;
				}
			}
			if (classString.includes("views-field-title")) {
				building.fullname = this.getText(cell);
				const link = this.findChild(cell, "a");
				if (link) {
					for (const attr of link.attrs) {
						if (attr.name === "href") {
							const rawHref = attr.value;
							building.href = rawHref.replace("./", "").replace(/^\//, "");
							building.shortname = path.basename(rawHref, ".htm");
							break;
						}
					}
				}
			} else if (classString.includes("views-field-field-building-address")) {
				building.address = this.getText(cell);
			}
		}

		return building;
	}

	private async extractRoomsFromBuilding(zip: JSZip, building: any): Promise<any[]> {
		const file = zip.file(building.href);
		if (!file) return [];

		const html = await file.async("text");
		const document = parse5.parse(html);
		const roomTable = this.findRoomTable(document);
		if (!roomTable) return [];

		const rows = this.findChildren(roomTable, "tr").slice(1);
		const geo = await this.getGeo(building.address);
		if (!geo) return [];

		const rooms: any[] = [];
		for (const row of rows) {
			const room = this.parseRoomRow(row, building, geo);
			if (room && room.name) rooms.push(room);
		}
		return rooms;
	}

	private parseRoomRow(row: any, b: any, geo: any): any {
		const cells = this.findChildren(row, "td");
		const room: any = {
			fullname: b.fullname,
			shortname: b.shortname,
			address: b.address,
			lat: geo.lat,
			lon: geo.lon,
		};

		for (const cell of cells) {
			let classString = "";
			for (const attr of cell.attrs) {
				if (attr.name === "class") {
					classString = attr.value;
					break;
				}
			}
			if (classString.includes("views-field-field-room-number")) {
				const link = this.findChild(cell, "a");
				room.number = this.getText(cell);
				room.name = `${b.shortname}_${room.number}`;
				for (const attr of link.attrs) {
					if (attr.name === "href") {
						room.href = attr.value;
						break;
					}
				}
			} else if (classString.includes("views-field-field-room-capacity")) {
				room.seats = Number(this.getText(cell));
			} else if (classString.includes("views-field-field-room-furniture")) {
				room.furniture = this.getText(cell);
			} else if (classString.includes("views-field-field-room-type")) {
				room.type = this.getText(cell);
			}
		}
		return room;
	}

	private async getDatasetIds(): Promise<string[]> {
		const files = await fs.readdir(this.dataDir);
		return files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
	}

	private async loadDatasetFromDisk(id: string): Promise<void> {
		const filePath = path.join(this.dataDir, `${id}.json`);
		if (await fs.pathExists(filePath)) {
			const obj = await fs.readJson(filePath);
			this.datasets.set(id, obj.data);
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!this.validId(id)) {
			throw new InsightError("Invalid dataset ID");
		}

		if (this.datasets.has(id)) {
			throw new InsightError("Duplicate dataset ID");
		}

		let data: any[];
		if (kind === InsightDatasetKind.Sections) {
			data = await this.extractSectionsFromZip(content);
		} else if (kind === InsightDatasetKind.Rooms) {
			data = await this.extractRoomsFromZip(content);
		} else {
			throw new InsightError("Kind is not rooms or sections");
		}

		await fs.writeJson(`${this.dataDir}/${id}.json`, {
			id,
			kind,
			numRows: data.length,
			data,
		});

		this.datasets.set(id, data);
		return this.getDatasetIds();
	}

	public async removeDataset(id: string): Promise<string> {
		if (!this.validId(id)) {
			throw new InsightError("Invalid dataset ID");
		}

		if (!this.datasets.has(id)) {
			throw new NotFoundError("Dataset does not have specificed ID");
		}

		const filePath = path.join(this.dataDir, `${id}.json`);
		if (!(await fs.pathExists(filePath))) {
			throw new NotFoundError("Dataset not found");
		}

		this.datasets.delete(id);
		await fs.remove(filePath);
		return id;
	}

	// making sure we section kets off
	private splitKey(k: string): [string, string] {
		const i = k.indexOf("_");
		return [k.slice(0, i), k.slice(i + 1)];
	}

	// making sure we get key properly from our ID
	private getIdFromKey(k: string): string | null {
		if (typeof k !== "string") return null;
		const i = k.indexOf("_");
		return i > 0 ? k.slice(0, i) : null;
	}

	// Getting Keys from all our queries
	// AI used here to implement transversing process instead of checking throughout using more space
	private collectAllQueryKeys(q: any): string[] {
		const keys: string[] = [];

		const walk = (node: any) => {
			if (!node || typeof node !== "object" || Array.isArray(node)) return;
			const tag = Object.keys(node)[0];
			const val = (node as any)[tag];

			if (tag === "AND" || tag === "OR") {
				if (!Array.isArray(val) || val.length === 0) {
					throw new InsightError(`${tag} must be a non-empty array`);
				}
				val.forEach(walk);
				return;
			}
			if (tag === "NOT") {
				walk(val);
				return;
			}
			if (tag === "LT" || tag === "GT" || tag === "EQ" || tag === "IS") {
				const fk = Object.keys(val)[0];
				keys.push(fk);
				return;
			}
			if (Object.keys(node).length === 0) return; // Done for empty WHERE
			throw new InsightError(`Unknown filter operator '${tag}'`);
		};

		walk(q.WHERE);

		// For the columns
		for (const c of q.OPTIONS.COLUMNS || []) {
			if (typeof c === "string" && c.includes("_")) keys.push(c);
		}

		// For our order function
		const order = q.OPTIONS.ORDER;
		if (typeof order === "string") {
			if (order.includes("_")) keys.push(order);
		} else if (order && typeof order === "object" && !Array.isArray(order)) {
			if (Array.isArray(order.keys)) {
				for (const k of order.keys) if (k.includes("_")) keys.push(k);
			}
		}

		// AI used here to reduce code for chaining to reduce lines and say code block is false when it doesnt contain GROUP
		if (q.TRANSFORMATIONS?.GROUP) {
			for (const g of q.TRANSFORMATIONS.GROUP) {
				if (typeof g === "string" && g.includes("_")) {
					keys.push(g);
				}
			}
		}

		if (q.TRANSFORMATIONS?.APPLY) {
			for (const rule of q.TRANSFORMATIONS.APPLY) {
				const kApply = Object.keys(rule)[0];
				const innerObject = rule[kApply];
				const aggregation = Object.keys(innerObject)[0];
				const f = innerObject[aggregation];
				if (typeof f === "string" && f.includes("_")) {
					keys.push(f);
				}
			}
		}

		return keys;
	}

	// Turn into fields
	private resolveField(row: any, field: string): any {
		// Our addDataset() created rows with keys: dept,id,avg,instructor,title,pass,fail,audit,uuid,year
		if (field in row) return row[field];
		// no aliasing needed for these tests, but keep a tiny fallback:
		const lc = field.toLowerCase();
		for (const k of Object.keys(row)) {
			if (k.toLowerCase() === lc) return row[k];
		}
		return undefined;
	}

	// AI: made evaluating more compact (before had more helpers)
	private evalFilter(node: any, row: any): boolean {
		if (!node || typeof node !== "object" || Array.isArray(node) || Object.keys(node).length === 0) {
			return true;
		}

		const tag = Object.keys(node)[0];
		const val = node[tag];

		switch (tag) {
			case "AND":
				if (!Array.isArray(val) || val.length === 0) throw new InsightError("AND must be a non-empty array");
				return val.every((c: any) => this.evalFilter(c, row));
			case "OR":
				if (!Array.isArray(val) || val.length === 0) throw new InsightError("OR must be a non-empty array");
				return val.some((c: any) => this.evalFilter(c, row));
			case "NOT":
				return !this.evalFilter(val, row);
			case "LT":
			case "GT":
			case "EQ": {
				const key = Object.keys(val)[0];
				const num = val[key];
				if (typeof num !== "number" || !Number.isFinite(num)) {
					throw new InsightError(`${tag} requires a numeric value`);
				}
				const [, field] = this.splitKey(key);
				const actual = this.resolveField(row, field);
				if (typeof actual !== "number") return false;
				if (tag === "LT") return actual < num;
				if (tag === "GT") return actual > num;
				return actual === num;
			}
			case "IS": {
				const key = Object.keys(val)[0];
				const pattern = val[key];
				if (typeof pattern !== "string") {
					throw new InsightError("IS requires a string pattern");
				}
				const [, field] = this.splitKey(key);
				const actual = this.resolveField(row, field);
				if (typeof actual !== "string") return false;
				return this.matchesIS(actual, pattern);
			}
			default:
				throw new InsightError(`Unknown filter operator '${tag}'`);
		}
	}

	// AI: used here to make astrikes logic make sense and how it should be formatted
	private matchesIS(actual: string, pattern: string): boolean {
		// middle wildcard is illegal
		if (pattern.length > 2 && pattern.slice(1, -1).includes("*")) {
			throw new InsightError('Query contains wildcard "*" in middle');
		}
		if (pattern === "*") return true;
		const starts = pattern.startsWith("*");
		const ends = pattern.endsWith("*");
		const core = pattern.replace(/^\*/, "").replace(/\*$/, "");

		if (!starts && !ends) return actual === core;
		if (starts && ends) return actual.includes(core);
		if (starts) return actual.endsWith(core);
		return actual.startsWith(core);
	}

	private transformationHelper(transformations: any, rows: any[], datasetId: string): any[] {
		// Validity checks
		if (typeof transformations !== "object" || Array.isArray(transformations)) {
			throw new InsightError("Invalid transformation");
		}
		const { GROUP, APPLY } = transformations;
		if (!Array.isArray(GROUP) || GROUP.length === 0) {
			throw new InsightError("Group is empty (shouldn't be empty)");
		}

		for (const g of GROUP) {
			if (typeof g !== "string" || !g.includes("_")) {
				throw new InsightError("Group keys should be valid Id's");
			}
			const [anotherId] = this.splitKey(g);
			if (anotherId !== datasetId) {
				throw new InsightError("Group keys should have same id");
			}
		}
		if (!Array.isArray(APPLY)) {
			throw new InsightError("Apply should be an array");
		}

		const traversed = new Set<string>();
		for (const rule of APPLY) {
			const keyApply = Object.keys(rule)[0];
			if (!keyApply || typeof keyApply !== "string") {
				throw new InsightError("Invalid key for apply");
			}

			if (keyApply.includes("_")) {
				throw new InsightError("Key for apply shouldn't include underscore");
			}
			if (traversed.has(keyApply)) {
				throw new InsightError("Key already in Apply");
			}
			traversed.add(keyApply);

			const innerObject = rule[keyApply];
			if (typeof innerObject !== "object" || Array.isArray(innerObject)) {
				throw new InsightError("Invalid rule for APPLY");
			}

			const aggregation = Object.keys(innerObject)[0];
			const keyComplete = innerObject[aggregation];

			if (typeof keyComplete != "string" || !keyComplete.includes("_")) {
				throw new InsightError("Aggregation for APPLY not with a fully complete key");
			}
			const [applyid] = this.splitKey(keyComplete);
			if (applyid !== datasetId) {
				throw new InsightError("apply keys differ, should be same");
			}
		}

		// AI usage to configure use of map properly to store and use key values
		const groups = new Map<string, any[]>();
		for (const r of rows) {
			const keySection = GROUP.map((g) => {
				const [, field] = this.splitKey(g);
				return this.resolveField(r, field);
			});
			const groupkey = keySection.join("|");
			if (!groups.has(groupkey)) {
				groups.set(groupkey, []);
			}
			groups.get(groupkey)!.push(r);
		}

		// AI usage for reducing code through creation of the aggregationHelper for APPLY
		const out: any[] = [];
		for (const rowGroups of groups.values()) {
			const obj: any = {};
			for (const g of GROUP) {
				const [, field] = this.splitKey(g);
				obj[g] = this.resolveField(rowGroups[0], field);
			}
			for (const rule of APPLY) {
				const keyApply = Object.keys(rule)[0];
				const innerObject = rule[keyApply];
				const aggregation = Object.keys(innerObject)[0];
				const keyComplete = innerObject[aggregation];
				obj[keyApply] = this.aggregationHelper(aggregation, keyComplete, rowGroups);
			}

			out.push(obj);
		}
		return out;
	}

	// AI usage when code smell found for checking each time (magic numbers) and how to use maps properly and math functions
	private aggregationHelper(aggregation: string, keyComplete: string, rows: any[]): number {
		const [, f] = this.splitKey(keyComplete);
		const keyValues = rows.map((r) => this.resolveField(r, f));
		const numberCheck = keyValues.every((n) => typeof n === "number" && Number.isFinite(n));

		switch (aggregation) {
			case "MAX":
				if (!numberCheck) {
					throw new InsightError("MAX should have numeric value");
				}
				return Math.max(...(keyValues as number[]));
			case "MIN":
				if (!numberCheck) {
					throw new InsightError("MIN should have numeric value");
				}
				return Math.min(...(keyValues as number[]));
			case "SUM":
				if (!numberCheck) {
					throw new InsightError("SUM should have numeric value");
				}
				return Number((keyValues as number[]).reduce((a, b) => a + b, 0).toFixed(2));
			case "AVG": {
				if (!numberCheck) {
					throw new InsightError("AVG should have numeric value");
				}
				const total = (keyValues as number[]).reduce((prev, t) => prev.add(new Decimal(t)), new Decimal(0));
				const average = total.toNumber() / keyValues.length;
				return Number(average.toFixed(2));
			}

			case "COUNT": {
				const countingSet = new Set(keyValues.map((n) => (n === null ? "null" : String(n))));
				return countingSet.size;
			}
			default:
				throw new InsightError("Invalid aggregation being done for Apply");
		}
	}

	// AI used for helper functions (usage for how we used it ontop of stub)a
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		if (query === null || typeof query !== "object" || Array.isArray(query)) {
			throw new InsightError("Query is not an object");
		}
		const q: any = query;

		if (!("OPTIONS" in q)) {
			throw new InsightError("Query missing OPTIONS");
		}
		if (typeof q.OPTIONS !== "object" || Array.isArray(q.OPTIONS)) {
			throw new InsightError("OPTIONS is not an object");
		}
		if (!("WHERE" in q)) {
			throw new InsightError("Query missing WHERE");
		}
		if (typeof q.WHERE !== "object" || Array.isArray(q.WHERE)) {
			throw new InsightError("WHERE is not an object");
		}
		if (!("COLUMNS" in q.OPTIONS)) {
			throw new InsightError("Query missing COLUMNS");
		}
		if (!Array.isArray(q.OPTIONS.COLUMNS)) {
			throw new InsightError("COLUMNS is not an array");
		}
		if (q.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("Query has empty COLUMNS");
		}

		const allKeys = this.collectAllQueryKeys(q);
		const ids = new Set(allKeys.map((k) => this.getIdFromKey(k)).filter((x): x is string => !!x));
		if (ids.size !== 1) {
			throw new InsightError("Query must reference exactly one dataset id");
		}
		const datasetId = [...ids][0];

		let rows = this.datasets.get(datasetId);
		if (!Array.isArray(rows)) {
			// Try to load from disk if not in memory
			await this.loadDatasetFromDisk(datasetId);
			rows = this.datasets.get(datasetId);
			if (!Array.isArray(rows)) {
				throw new InsightError("Using unadded dataset in query");
			}
		}

		// AI used here to integrate C2 helpers of aggregation and handleTransformations to reduce code (one function does one
		// thing not multiple things -> code smell slide reference :D )
		let filtered = rows.filter((r) => this.evalFilter(q.WHERE, r));

		if (q.TRANSFORMATIONS) {
			filtered = this.transformationHelper(q.TRANSFORMATIONS, filtered, datasetId);
		}

		// Validation (AI used for checking if used mapping functions correctly, and if not, AI implementation borrowed)

		if (q.TRANSFORMATIONS) {
			const groupKeys = new Set<string>(q.TRANSFORMATIONS.GROUP || []);
			const applyKeys = new Set<string>((q.TRANSFORMATIONS.APPLY || []).map((r: any) => Object.keys(r)[0]));

			for (const column of q.OPTIONS.COLUMNS) {
				if (typeof column !== "string") {
					throw new InsightError("Invalid key for COLUMNS");
				}
				const canApply = !column.includes("_");
				const canGroup = column.includes("_");

				if (canApply) {
					if (!applyKeys.has(column)) {
						throw new InsightError("The COLUMNS section has an apply key not found in our APPLY");
					}
				} else if (canGroup) {
					if (!groupKeys.has(column)) {
						throw new InsightError("Found something not in the group key dataset in COLUMNS for TRANSFORMATIONS");
					}
					const [columnId] = this.splitKey(column);
					if (columnId !== datasetId) {
						throw new InsightError("multiple dataset Ids fround in COLUMNS");
					}
				} else {
					throw new InsightError("Key invalid for COLUMNS");
				}
			}
		}

		const out: InsightResult[] = filtered.map((r) => {
			const obj: Record<string, any> = {};
			for (const column of q.OPTIONS.COLUMNS) {
				if (typeof column !== "string") {
					throw new InsightError("COLUMNS keys are invalid");
				}

				if (column.includes("_")) {
					const [columnId, f] = this.splitKey(column);
					if (columnId !== datasetId) {
						throw new InsightError("All COLUMNS keys must have the same dataset id");
					}
					obj[column] = column in r ? (r as any)[column] : this.resolveField(r, f);
				} else {
					if (!(column in r)) {
						throw new InsightError("Not found in system for applykey");
					}
					obj[column] = (r as any)[column];
				}
			}
			return obj as InsightResult;
		});

		if (q.OPTIONS.ORDER !== undefined) {
			const order = q.OPTIONS.ORDER;
			let keys: string[] = [];
			let dir: "UP" | "DOWN" = "UP";

			if (typeof order === "string") {
				keys = [order];
			} else if (order && typeof order === "object" && !Array.isArray(order)) {
				dir = order.dir === "DOWN" ? "DOWN" : "UP";
				if (!Array.isArray(order.keys) || order.keys.length === 0) {
					throw new InsightError("ORDER.keys must be a non-empty array");
				}
				keys = order.keys.slice();
			} else {
				throw new InsightError("ORDER must be a string or an object");
			}

			for (const k of keys) {
				if (!q.OPTIONS.COLUMNS.includes(k)) {
					throw new InsightError("Order key not in Columns");
				}
			}

			out.sort((a, b) => {
				for (const k of keys) {
					const va = (a as any)[k];
					const vb = (b as any)[k];
					if (va === vb) continue;
					const lt = va < vb ? -1 : 1; // works for numbers & strings
					return dir === "DOWN" ? -lt : lt;
				}
				return 0;
			});
		}
		// Making sure we did not go over the threshold
		if (out.length > 5000) {
			throw new ResultTooLargeError("ResultTooLargeError: more than 5000 results");
		}

		return out;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		if (!(await fs.pathExists(this.dataDir))) {
			return [];
		}

		const out: InsightDataset[] = [];
		const files = await fs.readdir(this.dataDir);

		for (const file of files) {
			if (!file.endsWith(".json")) continue;
			const obj = await fs.readJson(path.join(this.dataDir, file));
			out.push({ id: obj.id, kind: obj.kind, numRows: obj.numRows });
		}

		return out;
	}
}
