from aiohttp import web

if __name__ == '__main__':
	app = web.Application()
	app.add_routes([
		web.get('/', lambda r: web.FileResponse('static/index.html')),
		web.static('/', 'static'),
		web.static('/img', 'static/img')
	])
	web.run_app(app)
