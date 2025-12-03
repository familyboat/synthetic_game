import {serveDir} from '@std/http'

Deno.serve((req) => {
  return serveDir(req, {
    fsRoot: 'dist'
  })
})
