from aiohttp import web
import ssl

if __name__ == '__main__':
	app = web.Application()
	app.add_routes([
		web.get('/', lambda r: web.FileResponse('static/index.html')),
		web.static('/', 'static'),
		web.static('/img', 'static/img')
	])
	ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
	ssl_context.load_cert_chain('res/cert/server.crt', keyfile='res/cert/server.key')
	web.run_app(app, ssl_context=ssl_context)
