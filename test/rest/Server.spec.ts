// Done with the aid of AI

import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import Server from "../../src/rest/Server";
import { clearDisk, getContentFromArchives } from "../TestUtil";

describe("Server", function () {
	let server: Server;
	const port = 4321;
	let validSections: string;

	before(async function () {
		this.timeout(10000);
		validSections = await getContentFromArchives("pair.zip");
		await clearDisk();
	});

	beforeEach(async function () {
		this.timeout(10000);
		await clearDisk();
		server = new Server(port);
		await server.start();
	});

	afterEach(async function () {
		await clearDisk();
	});

	describe("User Story 1:", function () {
		it("should reject dataset ID containing underscore and return error message", async function () {
			const buffer = Buffer.from(validSections, "base64");
			const res = await request(server.getApp())
				.post("/dataset/invalid_id")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
			expect(res.body.error).to.be.a("string");
			expect(res.body.error.length).to.be.greaterThan(0);
		});

		it("should reject empty dataset ID and return error message", async function () {
			const buffer = Buffer.from(validSections, "base64");
			const res = await request(server.getApp())
				.post("/dataset/%20%20%20")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
		});

		it("should reject duplicate dataset ID and return error message", async function () {
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/testDataset")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp())
				.post("/dataset/testDataset")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
			expect(res.body.error).to.be.a("string");
		});

		it("should reject invalid/empty ZIP file and return error message", async function () {
			const invalidBuffer = Buffer.from("not a valid zip file");
			const res = await request(server.getApp())
				.post("/dataset/testDataset")
				.set("Content-Type", "application/octet-stream")
				.send(invalidBuffer);

			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
		});
	});

	describe("User Story 2:", function () {
		it("should add dataset successfully and return updated list of dataset IDs", async function () {
			this.timeout(10000);
			const buffer = Buffer.from(validSections, "base64");
			const res = await request(server.getApp())
				.post("/dataset/myDataset")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			expect(res.body.result).to.include("myDataset");
		});

		it("should return all dataset IDs after adding multiple datasets", async function () {
			this.timeout(20000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/dataset1")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp())
				.post("/dataset/dataset2")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result).to.be.an("array");
			expect(res.body.result).to.include("dataset1");
			expect(res.body.result).to.include("dataset2");
			expect(res.body.result).to.have.length(2);
		});

		it("should immediately reflect added dataset in GET /datasets", async function () {
			this.timeout(10000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/newDataset")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/datasets");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result).to.be.an("array");
			expect(res.body.result.length).to.equal(1);
			expect(res.body.result[0].id).to.equal("newDataset");
		});
	});

	describe("User Story 3:", function () {
		it("should return empty array when no datasets exist", async function () {
			const res = await request(server.getApp()).get("/datasets");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			expect(res.body.result).to.have.length(0);
		});

		it("should return dataset with id, kind, and numRows properties", async function () {
			this.timeout(10000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/testDataset")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/datasets");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result).to.be.an("array");
			expect(res.body.result).to.have.length(1);

			const dataset = res.body.result[0];
			expect(dataset).to.have.property("id");
			expect(dataset).to.have.property("kind");
			expect(dataset).to.have.property("numRows");
			expect(dataset.id).to.equal("testDataset");
			expect(dataset.kind).to.equal("sections");
			expect(dataset.numRows).to.be.a("number");
			expect(dataset.numRows).to.be.greaterThan(0);
		});

		it("should return multiple datasets with consistent formatting", async function () {
			this.timeout(20000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/datasetA")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			await request(server.getApp())
				.post("/dataset/datasetB")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/datasets");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result).to.have.length(2);

			for (const dataset of res.body.result) {
				expect(dataset).to.have.property("id");
				expect(dataset).to.have.property("kind");
				expect(dataset).to.have.property("numRows");
				expect(dataset.id).to.be.a("string");
				expect(dataset.kind).to.be.a("string");
				expect(dataset.numRows).to.be.a("number");
			}
		});

		it("should update list after remove operation", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/toRemove")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			await request(server.getApp()).delete("/dataset/toRemove");

			const res = await request(server.getApp()).get("/datasets");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result).to.have.length(0);
		});
	});

	describe("User Story 4:", function () {
		it("should remove dataset successfully and return success response", async function () {
			this.timeout(10000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/testDataset")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).delete("/dataset/testDataset");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.equal("testDataset");
		});

		it("should return error when trying to remove non-existent dataset", async function () {
			const res = await request(server.getApp()).delete("/dataset/nonexistent");

			expect(res.status).to.equal(StatusCodes.NOT_FOUND);
			expect(res.body).to.have.property("error");
			expect(res.body.error).to.be.a("string");
		});

		it("should return error for invalid dataset ID on delete", async function () {
			const res = await request(server.getApp()).delete("/dataset/invalid_id");

			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
		});

		it("should not affect other datasets when removing one", async function () {
			this.timeout(20000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/keepThis")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			await request(server.getApp())
				.post("/dataset/removeThis")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			await request(server.getApp()).delete("/dataset/removeThis");

			const res = await request(server.getApp()).get("/datasets");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result).to.have.length(1);
			expect(res.body.result[0].id).to.equal("keepThis");
		});

		it("should allow re-adding a dataset after removal", async function () {
			this.timeout(20000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/reusable")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			await request(server.getApp()).delete("/dataset/reusable");

			const addRes = await request(server.getApp())
				.post("/dataset/reusable")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			expect(addRes.status).to.equal(StatusCodes.OK);
			expect(addRes.body.result).to.include("reusable");
		});
	});

	describe("User Story 5:", function () {
		it("should return three insight arrays for a valid dataset", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/insightTest")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/dataset/insightTest/insights");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.have.property("insight1");
			expect(res.body.result).to.have.property("insight2");
			expect(res.body.result).to.have.property("insight3");
			expect(res.body.result.insight1).to.be.an("array");
			expect(res.body.result.insight2).to.be.an("array");
			expect(res.body.result.insight3).to.be.an("array");
		});

		it("should return 404 for insights of non-existent dataset", async function () {
			const res = await request(server.getApp()).get("/dataset/nonexistent/insights");

			expect(res.status).to.equal(StatusCodes.NOT_FOUND);
			expect(res.body).to.have.property("error");
		});

		it("insight1 should contain department and avgGrade for bar chart", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/chartTest")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/dataset/chartTest/insights");

			expect(res.status).to.equal(StatusCodes.OK);

			if (res.body.result.insight1.length > 0) {
				const firstItem = res.body.result.insight1[0];
				expect(firstItem).to.have.property("chartTest_dept");
				expect(firstItem).to.have.property("avgGrade");
				expect(firstItem.avgGrade).to.be.a("number");
			}
		});

		it("insight2 should contain department and count for pie chart", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/pieTest")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/dataset/pieTest/insights");

			expect(res.status).to.equal(StatusCodes.OK);

			if (res.body.result.insight2.length > 0) {
				const firstItem = res.body.result.insight2[0];
				expect(firstItem).to.have.property("pieTest_dept");
				expect(firstItem).to.have.property("count");
				expect(firstItem.count).to.be.a("number");
			}
		});

		it("insight3 should contain course info and avgGrade for line chart", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/lineTest")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/dataset/lineTest/insights");

			expect(res.status).to.equal(StatusCodes.OK);

			if (res.body.result.insight3.length > 0) {
				const firstItem = res.body.result.insight3[0];
				expect(firstItem).to.have.property("lineTest_dept");
				expect(firstItem).to.have.property("lineTest_id");
				expect(firstItem).to.have.property("avgGrade");
				expect(firstItem.avgGrade).to.be.a("number");
			}
		});

		it("should support department filtering via query parameter", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/filterTest")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/dataset/filterTest/insights?depts=cpsc");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");

			if (res.body.result.insight1.length > 0) {
				for (const item of res.body.result.insight1) {
					expect(item["filterTest_dept"]).to.equal("cpsc");
				}
			}
		});

		it("should return empty arrays (not errors) when no data matches filter", async function () {
			this.timeout(15000);
			const buffer = Buffer.from(validSections, "base64");

			await request(server.getApp())
				.post("/dataset/emptyFilter")
				.set("Content-Type", "application/octet-stream")
				.send(buffer);

			const res = await request(server.getApp()).get("/dataset/emptyFilter/insights?depts=nonexistentdept");

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body.result.insight1).to.be.an("array");
			expect(res.body.result.insight2).to.be.an("array");
			expect(res.body.result.insight3).to.be.an("array");
		});
	});
});
