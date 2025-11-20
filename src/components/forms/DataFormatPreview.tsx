/**
 * Data Format Parser Preview Component
 *
 * Shows information about data format parsers and file processing status
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, FileText, Database } from "lucide-react";

interface DataFormatPreviewProps {
  allFileData: any[];
}

export function DataFormatPreview({
  allFileData,
}: DataFormatPreviewProps) {
  if (!allFileData || allFileData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {allFileData.slice(0, 3).map((fileInfo, index) => (
        <div key={index} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-medium text-sm">
                {fileInfo.filename || `File ${index + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {fileInfo.type === "experiment_data" ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Parsed
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <Badge variant="secondary">
                    {fileInfo.type || "Unknown"}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {fileInfo.type === "experiment_data" && fileInfo.dataFields && (
            <div className="text-sm text-gray-600 space-y-1">
              {fileInfo.dataFields.format && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Format:</span>
                  <Badge variant="outline">
                    {fileInfo.dataFields.format}
                  </Badge>
                </div>
              )}

              {fileInfo.dataFields.summary?.recordCount && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Records:</span>
                  <span>
                    {fileInfo.dataFields.summary.recordCount.toLocaleString()}
                  </span>
                </div>
              )}

              {fileInfo.dataFields.columns && (
                <div className="flex items-start gap-2">
                  <span className="font-medium">Columns:</span>
                  <div className="flex flex-wrap gap-1">
                    {fileInfo.dataFields.columns
                      .slice(0, 5)
                      .map((col: string, colIndex: number) => (
                        <Badge
                          key={colIndex}
                          variant="outline"
                          className="text-xs"
                        >
                          {col}
                        </Badge>
                      ))}
                    {fileInfo.dataFields.columns.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{fileInfo.dataFields.columns.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {fileInfo.dataFields.metadata &&
                Object.keys(fileInfo.dataFields.metadata).length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-xs">Metadata:</span>
                    <div className="bg-gray-50 rounded p-2 mt-1 text-xs">
                      {Object.entries(fileInfo.dataFields.metadata)
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span className="text-gray-600">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      {Object.keys(fileInfo.dataFields.metadata).length >
                        3 && (
                        <div className="text-gray-500 text-center">
                          +
                          {Object.keys(fileInfo.dataFields.metadata).length -
                            3}{" "}
                          more fields
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {fileInfo.type === "document" && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Status:</span> Stored as document
              (no parsing applied)
            </div>
          )}

          {fileInfo.type === "image" && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Status:</span> Image processed for
              display
            </div>
          )}
        </div>
      ))}
      {allFileData.length > 3 && (
        <div className="text-sm text-gray-500 text-center py-2">
          ... and {allFileData.length - 3} more file{allFileData.length - 3 !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
