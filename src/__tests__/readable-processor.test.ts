/**
 * processPlainTextFile: a text file is an experiment only when a parser claims it.
 */
import { processPlainTextFile } from "../utils/file-management/processors/readable-processor";
import { UnrecognisedDataFileError } from "../utils/file-management/processors/types";

const makeParams = (file: File) => ({
  file,
  defaultValues: { name: "", type: "", date: new Date() },
  samples: [],
  existingNames: [],
  form: { setValue: jest.fn() },
  setFormState: jest.fn(),
  setAllFileData: jest.fn(),
});

describe("processPlainTextFile", () => {
  it("rejects text no parser recognises, and adds nothing to the form", async () => {
    const params = makeParams(
      new File(["just some prose, nothing an instrument would write"], "notes.txt", { type: "text/plain" }),
    );
    await expect(processPlainTextFile(params as any)).rejects.toBeInstanceOf(UnrecognisedDataFileError);
    expect(params.setAllFileData).not.toHaveBeenCalled();
  });

  it("fills the form for a CSV a parser recognises", async () => {
    const params = makeParams(new File(["a,b,c\n1,2,3\n4,5,6"], "data.csv", { type: "text/csv" }));
    await processPlainTextFile(params as any);
    expect(params.setAllFileData).toHaveBeenCalled();
  });
});
