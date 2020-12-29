# infodb-cli

## Example

* package.json

```json
{
  ...
  "scripts": {
    "up": "infodb-cli docker start test.yml"
  }
  ...
}
```

* command line

```sh
npm run up
```

## Usage

```sh
Usage: infodb-cli <cmd> [options] <file ...>

Options:
  -V, --version               output the version number
  -h, --help                  display help for command

Commands:
  docker <start|stop> [file]  execute docker-compose.
  help [command]              display help for command
```
