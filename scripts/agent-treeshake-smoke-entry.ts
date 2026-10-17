import { Agent } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai";
import { greenptProvider } from "@earendil-works/pi-ai/providers/greenpt";

const models = createModels();
models.setProvider(greenptProvider());
const model = models.getModel("greenpt", "glm-5.2");
if (!model) throw new Error("GreenPT smoke-test model not found");

export const agent = new Agent({
	initialState: { model },
	streamFn: models.streamSimple.bind(models),
});
