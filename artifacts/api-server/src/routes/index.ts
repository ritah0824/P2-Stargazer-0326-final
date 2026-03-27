import { Router, type IRouter } from "express";
import healthRouter from "./health";
import skyRouter from "./sky";
import weatherRouter from "./weather";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sky", skyRouter);
router.use("/sky/weather", weatherRouter);

export default router;
