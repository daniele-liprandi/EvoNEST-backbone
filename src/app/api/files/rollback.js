import fs from "fs";

/**
 * Undo a partial upload: remove the written file and its document. Both steps
 * are attempted independently so a failure in one still runs the other, and
 * each failure is logged rather than thrown.
 *
 * Lives outside route.js because Next.js's route type-checking rejects a
 * route module that exports anything besides the recognized handlers/config.
 */
export async function rollbackUpload(filePath, fileId, filesCollection) {
    const [unlinkResult, deleteResult] = await Promise.allSettled([
        fs.promises.unlink(filePath),
        filesCollection.deleteOne({ _id: fileId }),
    ]);
    if (unlinkResult.status === "rejected") {
        console.error(`Upload rollback: failed to remove file ${filePath}:`, unlinkResult.reason);
    }
    if (deleteResult.status === "rejected") {
        console.error(`Upload rollback: failed to remove file document ${fileId}:`, deleteResult.reason);
    }
}
