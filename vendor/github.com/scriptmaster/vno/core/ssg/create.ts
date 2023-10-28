import { files } from "../templates/universal.ts";
import { writeTemplate } from "../templates/write.ts";

export const create = (root: string) => {
  return writeTemplate(files, root);
};
