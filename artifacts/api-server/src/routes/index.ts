import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import platformsRouter from "./platforms";
import campaignsRouter from "./campaigns";
import urlsRouter from "./urls";
import postsRouter from "./posts";
import logsRouter from "./logs";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(platformsRouter);
router.use(campaignsRouter);
router.use(urlsRouter);
router.use(postsRouter);
router.use(logsRouter);
router.use(settingsRouter);

export default router;
