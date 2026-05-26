import { ObjectId } from "mongodb";

export function isObjectIdString(value) {
  return (
    typeof value === "string" &&
    ObjectId.isValid(value) &&
    new ObjectId(value).toString() === value
  );
}
