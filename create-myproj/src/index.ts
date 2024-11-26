import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type Argv,
	type ESLintTemplateName,
	create,
	checkCancel,
	select,
} from "create-rstack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getTemplateName({ template }: Argv) {
	if (typeof template === "string") {
		return template;
	}

	const tmpl = checkCancel<string>(
		await select({
			message: "Select a template",
			options: [
				{ value: "react-ts", label: "React with TypeScript" },
				{ value: "tanstack-router", label: "TanStack Router" },
			],
		}),
	);
	return tmpl;
}

function mapESLintTemplate(templateName: string): ESLintTemplateName {
	return templateName as ESLintTemplateName;
}

create({
	root: path.resolve(__dirname, ".."),
	name: "rsbuild with shadcn/ui",
	templates: ["react-ts", "tanstack-router"],
	skipFiles: [".npmignore"],
	getTemplateName,
	mapESLintTemplate,
});
