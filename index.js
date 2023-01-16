import http from "node:http";
import fs from "node:fs";
import { Readable, Transform } from "node:stream";
import { WritableStream, TransformStream } from "node:stream/web";
import csvtojson from "csvtojson";
import { setTimeout } from "node:timers/promises";

const PORT = 3000;

//➜ curl -N localhost:3000
//➜ curl -i -X OPTIONS -N localhost:3000

async function handleServer(request, response) {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "*",
	};

	if (request.method === "OPTIONS") {
		response.writeHead(204, headers);
		return response.end();
	}

	request.on("close", () => console.log("Connection has been close"));

	let items = 0;

	const readStream = fs.createReadStream("./animeflv.csv");
	Readable.toWeb(readStream)
		// passo a passo
		.pipeThrough(Transform.toWeb(csvtojson()))
		.pipeThrough(
			new TransformStream({
				transform(chunk, controller) {
					const jsonString = Buffer.from(chunk).toString();
					const data = JSON.parse(jsonString);
					const content = {
						title: data.title,
						description: data.description,
						url_anime: data.url_anime,
					};
					controller.enqueue(JSON.stringify(content).concat("\n"));
				},
			})
		)
		// ultima etapa
		.pipeTo(
			new WritableStream({
				async write(chunk) {
					await setTimeout(1000);
					items++;
					response.write(chunk);
				},
				close() {
					response.end();
				},
			})
		);

	response.writeHead(200, headers);
}

http.createServer(handleServer)
	.listen(PORT)
	.on("listening", () => console.log(`Listening to port ${PORT}`));
