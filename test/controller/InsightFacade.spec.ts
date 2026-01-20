import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

/* Citations for ai:
------------------------
Got help with which test cases I may be missing for addDataset and removeDataset.
Got help with finding the free mutant test case of the wildcard "*", recieved help from gpt about which cases were needed

*/

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		rooms = await getContentFromArchives("campus.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("addDataset should reject with an empty dataset id", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("addDataset should reject with a whitespace dataset id", async function () {
			try {
				await facade.addDataset("    ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a duplicate dataset id", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
				expect.fail("Should not have thrown!");
			}

			try {
				await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
				const list = await facade.listDatasets();
				expect(list).to.have.length(1);
			}
		});

		it("should reject with a underscores in dataset id", async function () {
			try {
				await facade.addDataset("hello_i_have_underscores", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("addDataset should reject with an invalid kind (rooms instead of section)", async function () {
			try {
				await facade.addDataset("testCourses", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("addDataset should reject with non zip base 64", async function () {
			const notZipBase64 = Buffer.from("hello world", "utf8").toString("base64");
			try {
				await facade.addDataset("notZip", notZipBase64, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("addDataset should reject with zip missing a courses folder", async function () {
			const noCoursesZip = await getContentFromArchives("noCourses.zip");
			try {
				await facade.addDataset("nocourses", noCoursesZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("addDataset should reject with zip missing sections", async function () {
			const noSections = await getContentFromArchives("noSections.zip");
			try {
				await facade.addDataset("novalid", noSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("addDataset with no issues", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
				const list = await facade.listDatasets();
				expect(list).to.have.length(1);
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});

		it("addDataset with no issues (2 datasets)", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
				const list = await facade.listDatasets();
				expect(list).to.have.length(1);
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}

			try {
				const result = await facade.addDataset("testCourses2", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses2");
				const newList = await facade.listDatasets();
				expect(newList).to.have.length(2);
				expect(result).to.have.members(["testCourses", "testCourses2"]);
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});

		it("dataset should persist on fresh start ", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
				const list = await facade.listDatasets();
				expect(list).to.have.length(1);

				const freshStart = new InsightFacade();
				const freshList = await freshStart.listDatasets();

				expect(freshList).to.deep.equal(list);
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});

		it("addDataset should work with spaces between id", async function () {
			try {
				const result = await facade.addDataset("test Courses ", sections, InsightDatasetKind.Sections);
				expect(result).to.include("test Courses ");
				const list = await facade.listDatasets();
				expect(list).to.have.length(1);
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});

		it("should successfully add a rooms dataset", async () => {
			const content = await getContentFromArchives("campus.zip");
			const result = await facade.addDataset("rooms", content, InsightDatasetKind.Rooms);
			expect(result).to.include("rooms");
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("removeDataset should reject with an empty dataset id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("removeDataset should reject with a whitespace dataset id", async function () {
			try {
				await facade.removeDataset("    ");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("removeDataset should reject with underscore id", async function () {
			try {
				await facade.removeDataset("hello_i_have_underscores");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("removeDataset should reject with valid id that was never added", async function () {
			try {
				await facade.removeDataset("testCourses");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("removeDataset with no issues", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
				await facade.removeDataset("testCourses");
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});

		// Got help from GPT with this case
		it("should not have dataset in list after deleting and new instance of InsightFacade ", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
				await facade.removeDataset("testCourses");

				const cleanSlate = new InsightFacade();
				const list = await cleanSlate.listDatasets();
				expect(list.find((d) => d.id === "testCourses")).to.be.undefined;
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});

		it("should not be able to remove dataset twice", async function () {
			try {
				const result = await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);
				expect(result).to.include("testCourses");
				await facade.removeDataset("testCourses");
				await facade.removeDataset("testCourses");
				expect.fail("Should not have thrown Error");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("dataset persists across instances and can be removed in new instance ", async function () {
			try {
				await facade.addDataset("testCourses", sections, InsightDatasetKind.Sections);

				const cleanSlate = new InsightFacade();
				const removed = await cleanSlate.removeDataset("testCourses");

				expect(removed).to.equal("testCourses");
			} catch (err) {
				expect.fail(`Should not have thrown: ${err}`);
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect.fail("Unknown Expected Error");
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			// check if result = expected, and that it is an array
			expect(result, "should resolve to an array").to.be.an("array");
			expect(result).to.deep.equal(expected);
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		// Valid cases
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/foundNothing.json] Query Found Nothing", checkQuery);
		it("[valid/exactMatch.json] Courses matching exact criteria", checkQuery);
		it('[valid/endsWithWildcard.json] Query ending with wildcard "*"', checkQuery);
		it('[valid/startsWithWildcard.json] Query Starting with wildcard "*"', checkQuery);
		it('[valid/startsEndsWithWildcard.json] Query starting and ending with wildcard "*"', checkQuery);
		it("[valid/useOr.json] Use query with OR", checkQuery);
		it("[valid/useNot.json] Query using NOT", checkQuery);
		it("[valid/useYear.json] Query using Year", checkQuery);
		it("[valid/useAudit.json] Query using Audit", checkQuery);
		it("[valid/usePass.json] Query using Pass", checkQuery);
		it("[valid/useFail.json] Query using Fail", checkQuery);
		it("[valid/useInstructor.json] Query using Instructor", checkQuery);
		it("[valid/useAndWithOr.json] Query using And with OR", checkQuery);

		// Invalid cases
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/columnsNotArray.json] COLUMNS is not an array", checkQuery);
		it("[invalid/optionsNotObject.json] OPTIONS is not an object", checkQuery);
		it("[invalid/queryNotObject.json] Query is not an object", checkQuery);
		it("[invalid/whereNotObject.json] WHERE is not an object", checkQuery);
		it("[invalid/missingColumns.json] Query missing COLUMNS", checkQuery);
		it("[invalid/missingOptions.json] Query missing OPTIONS", checkQuery);
		it("[invalid/emptyColumns.json] Query has empty COLUMNS", checkQuery);
		it('[invalid/wildcardInMiddle.json] Query contains wildcard "*" in middle', checkQuery);
		it("[invalid/orderKeyNotInColumns.json] Order key not in Columns", checkQuery);
		it("[invalid/queryTooBig.json] Query Too large can't return more than 5000 results", checkQuery);
		it("[invalid/unaddedDatasetRef.json] Using unadded dataset in query", checkQuery);
		it("[invalid/invalidKeyIS.json] Using IS with a number instead of string", checkQuery);
		it("[invalid/invalidKeyGT.json] Using GT with a string instead of number", checkQuery);
		it("[valid/useGroupApply.json] Group rooms using apply and Max", checkQuery);
		it("[valid/useGroupApplySum.json] Group rooms using apply and Sum", checkQuery);
		it("[valid/useGroupApplyAvg.json] Group rooms using apply and Avg", checkQuery);
		it("[valid/useAggregation.json] Aggregation in query", checkQuery);
	});
});
