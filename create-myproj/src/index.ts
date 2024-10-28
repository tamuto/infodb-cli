import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Argv, type ESLintTemplateName, create } from "create-rstack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getTemplateName({ template }: Argv) {
	return "react-ts";
}

function mapESLintTemplate(templateName: string): ESLintTemplateName {
	return "react-ts";
}

create({
	root: path.resolve(__dirname, ".."),
	name: "rspack with shadcn/ui",
	templates: ["react-ts"],
	skipFiles: [".npmignore"],
	getTemplateName,
	mapESLintTemplate,
});
