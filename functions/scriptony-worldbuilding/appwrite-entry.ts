import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import type { RequestLike, ResponseLike } from "../_shared/http";
import worldCategoriesHandler from "./worlds/[id]/categories/index";
import worldCharactersHandler from "./characters";
import healthHandler from "./health";
import worldByIdHandler from "./worlds/[id]";
import worldItemsHandler from "./worlds/[id]/items";
import worldUploadImageHandler from "./worlds/[id]/upload-image";
import worldsHandler from "./worlds/index";

async function dispatch(req: RequestLike, res: ResponseLike) {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    await healthHandler(req, res);
    return;
  }
  if (pathname === "/worlds") {
    await worldsHandler(req, res);
    return;
  }
  if (pathname === "/characters") {
    await worldCharactersHandler(req, res);
    return;
  }

  const categoriesMatch = pathname.match(/^\/worlds\/([^/]+)\/categories$/);
  if (categoriesMatch) {
    await worldCategoriesHandler(
      withParams(req, { id: categoriesMatch[1] }),
      res,
    );
    return;
  }
  const itemsMatch = pathname.match(/^\/worlds\/([^/]+)\/items$/);
  if (itemsMatch) {
    await worldItemsHandler(withParams(req, { id: itemsMatch[1] }), res);
    return;
  }
  const uploadMatch = pathname.match(/^\/worlds\/([^/]+)\/upload-image$/);
  if (uploadMatch) {
    await worldUploadImageHandler(withParams(req, { id: uploadMatch[1] }), res);
    return;
  }
  const byIdMatch = pathname.match(/^\/worlds\/([^/]+)$/);
  if (byIdMatch) {
    await worldByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendRouteNotFound("scriptony-worldbuilding", req, res);
}

export default createAppwriteHandler(dispatch);
