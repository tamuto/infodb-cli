# Troubleshooting

## Common Issues

### Vite-related Issues

**Error: "Vite root directory not found"**
- Check that the `root` path in your config exists
- Use relative paths from where you run `revx start`
- Example: If config is in project root, use `./apps/myapp` not `/apps/myapp`

**Multiple Vite servers slow to start**
- This is normal - each Vite server initializes independently
- Use `--verbose` to see progress
- First startup is slower (dependency pre-bundling)

### HMR Issues

**HMR not working for proxied webpack app**
- Make sure `ws: true` is set in the route config
- Check that the webpack dev server is actually running
- Verify WebSocket connection in browser dev tools
- No additional webpack configuration needed - revx handles WebSocket upgrade automatically

**Does webpack need special configuration?**
- No! Just add `ws: true` in revx config
- revx automatically handles WebSocket upgrade requests
- Your existing webpack dev server config works as-is

### Performance Issues

**Performance Issues with Dev Servers**

If you experience slow loading or timeouts when proxying to Vite or similar dev servers:

1. **Increase max sockets**:
   ```yaml
   server:
     maxSockets: 512  # or higher
   ```

2. **Use verbose mode** to check socket configuration:
   ```bash
   revx start --verbose
   ```

3. **Check the log output** for "Max sockets configured: XXX"

### Routing Issues

**Q: Routes not matching correctly**
- Routes are automatically sorted by specificity (longest first)
- Use `--verbose` mode to see the sorted route order

**Q: Path not being rewritten**
- `pathRewrite` is optional; paths are preserved by default
- Only use `pathRewrite` when you need to modify the path

### CORS Issues

**Q: CORS errors**
- Enable CORS in global config
- Check the `origin` setting matches your client URL

Example:
```yaml
global:
  cors:
    enabled: true
    origin: "http://localhost:5173"
    credentials: true
```
