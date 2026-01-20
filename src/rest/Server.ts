import express, { Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import InsightFacade from "../controller/InsightFacade";
import { InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError } from "../controller/IInsightFacade";
import * as fs from "fs-extra";
import path from "path";

export default class Server {
	private readonly app = express();
	private readonly port: number;
	private facade: InsightFacade;

	public getApp(): express.Application {
		return this.app;
	}

	constructor(port: number) {
		this.port = port;
		this.facade = new InsightFacade();
	}

	private async loadDatasetsFromDisk(): Promise<void> {}

	public async start(): Promise<void> {
		await this.loadDatasetsFromDisk();

		this.app.use(express.json());
		this.app.use(express.raw({ type: "application/*", limit: "10mb" }));

		this.app.use(cors());

		this.registerRoutes();

		this.app.listen(this.port, () => {
			console.log(`Server listening on port ${this.port}`);
		});
	}

	// GOT HELP FROM AI FOR THIS FUNCTION
	private registerRoutes(): void {
		this.app.post("/dataset/:id", async (req: Request, res: Response) => {
			try {
				const id = req.params.id;
				const content = (req.body as Buffer).toString("base64");
				const kind = InsightDatasetKind.Sections;

				const result = await this.facade.addDataset(id, content, kind);
				res.status(StatusCodes.OK).json({ result });
			} catch (err) {
				if (err instanceof InsightError) {
					res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
				} else {
					res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						error: "Internal server error",
					});
				}
			}
		});

		this.app.delete("/dataset/:id", async (req: Request, res: Response) => {
			try {
				const id = req.params.id;
				const result = await this.facade.removeDataset(id);
				res.status(StatusCodes.OK).json({ result });
			} catch (err) {
				if (err instanceof NotFoundError) {
					res.status(StatusCodes.NOT_FOUND).json({ error: err.message });
				} else if (err instanceof InsightError) {
					res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
				} else {
					res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						error: "Internal server error",
					});
				}
			}
		});

		this.app.get("/datasets", async (req: Request, res: Response) => {
			try {
				const result = await this.facade.listDatasets();
				res.status(StatusCodes.OK).json({ result });
			} catch (err) {
				res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					error: "Internal server error",
				});
			}
		});

		this.app.get("/dataset/:id/insights", async (req: Request, res: Response) => {
			try {
				const id = req.params.id;
				const datasets = await this.facade.listDatasets();
				const dataset = datasets.find((d) => d.id === id);

				if (!dataset) {
					res.status(StatusCodes.NOT_FOUND).json({
						error: "Dataset not found",
					});
					return;
				}

				const deptsParam = req.query.depts as string | undefined;
				let deptFilter: string[] = [];
				if (deptsParam && deptsParam.trim().length > 0) {
					deptFilter = deptsParam
						.split(",")
						.map((d) => d.trim())
						.filter((d) => d.length > 0);
				}

				const buildWhere = (depts: string[]) => {
					if (depts.length === 0) {
						return {};
					}
					if (depts.length === 1) {
						return {
							IS: {
								[`${id}_dept`]: depts[0],
							},
						};
					}
					return {
						OR: depts.map((d) => ({
							IS: {
								[`${id}_dept`]: d,
							},
						})),
					};
				};

				const where = buildWhere(deptFilter);

				const insight1Query = {
					WHERE: where,
					TRANSFORMATIONS: {
						GROUP: [`${id}_dept`],
						APPLY: [
							{
								avgGrade: {
									AVG: `${id}_avg`,
								},
							},
						],
					},
					OPTIONS: {
						COLUMNS: [`${id}_dept`, "avgGrade"],
						ORDER: {
							dir: "DOWN",
							keys: ["avgGrade"],
						},
					},
				};

				const insight2Query = {
					WHERE: where,
					TRANSFORMATIONS: {
						GROUP: [`${id}_dept`],
						APPLY: [
							{
								count: {
									COUNT: `${id}_uuid`,
								},
							},
						],
					},
					OPTIONS: {
						COLUMNS: [`${id}_dept`, "count"],
						ORDER: {
							dir: "DOWN",
							keys: ["count"],
						},
					},
				};

				const insight3Query = {
					WHERE: where,
					TRANSFORMATIONS: {
						GROUP: [`${id}_dept`, `${id}_id`],
						APPLY: [
							{
								avgGrade: {
									AVG: `${id}_avg`,
								},
							},
						],
					},
					OPTIONS: {
						COLUMNS: [`${id}_dept`, `${id}_id`, "avgGrade"],
						ORDER: {
							dir: "DOWN",
							keys: ["avgGrade"],
						},
					},
				};

				let insight1Data: any[] = [];
				let insight2Data: any[] = [];
				let insight3Data: any[] = [];

				try {
					insight1Data = await this.facade.performQuery(insight1Query);
				} catch (err) {
					console.error("Insight1 query failed:", err);
				}

				try {
					insight2Data = await this.facade.performQuery(insight2Query);
				} catch (err) {
					console.error("Insight2 query failed:", err);
				}

				try {
					insight3Data = await this.facade.performQuery(insight3Query);
					insight3Data = insight3Data.slice(0, 10);
				} catch (err) {
					console.error("Insight3 query failed:", err);
					insight3Data = [];
				}

				res.status(StatusCodes.OK).json({
					result: {
						insight1: insight1Data,
						insight2: insight2Data,
						insight3: insight3Data,
					},
				});
			} catch (err) {
				if (err instanceof InsightError) {
					res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
				} else if (err instanceof ResultTooLargeError) {
					res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
				} else {
					res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						error: "Internal server error",
					});
				}
			}
		});
	}
}
