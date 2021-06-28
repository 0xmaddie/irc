export const MESSAGE_PATTERN =
  /^(?:@([^\r\n ]*) +)?(?::([^\r\n ]+) +)?([^\r\n ]+)(?: +([^:\r\n ]+[^\r\n ]*(?: +[^:\r\n ]+[^\r\n ]*)*)|)?(?: +:([^\r\n]*)| +)?[\r\n]*$/;

export interface Message {
  tags: string;
  sender: string;
  kind: string;
  parameters: string[];
  source: string;
}

export function parse(source: string): Message {
  const match = source.match(MESSAGE_PATTERN);
  if (!match) {
    throw `Invalid IRC message: ${source}`;
  }
  const tags = match[1];
  const sender = match[2];
  const kind = match[3];
  let parameters: string[];
  if (match[4]) {
    parameters = match[4].split(" ");
  } else {
    parameters = [];
  }
  if (match[5]) {
    parameters.push(match[5]);
  }
  return { tags, sender, kind, parameters, source };
}


import { writeAll } from "https://deno.land/std@0.97.0/io/util.ts";
import { readLines } from "https://deno.land/std@0.97.0/io/bufio.ts";

async function writeAllText(
  sink: Deno.Writer,
  message: string,
): Promise<void> {
  const buffer = new TextEncoder().encode(message);
  await writeAll(sink, buffer);
}

export class Client {
  conn: Deno.Conn;

  constructor(conn: Deno.Conn) {
    this.conn = conn;
  }

  async *messages(): AsyncGenerator<Message> {
    for await (const line of readLines(this.conn)) {
      yield parse(line);
    }
  }

  async _send(message: string): Promise<void> {
    console.log(`=> ${message}`);
    await writeAllText(this.conn, message);
  }

  async nick(nickname: string): Promise<void> {
    const message = [
      `NICK ${nickname}\n`,
      `USER ${nickname} 0 * :${nickname}\n`,
    ].join("");
    await this._send(message);
  }

  async pass(password: string): Promise<void> {
    await this._send(`PASS ${password}\n`);
  }

  async join(channel: string): Promise<void> {
    await this._send(`JOIN ${channel}\n`);
  }

  async pong(message: string): Promise<void> {
    await this._send(`PONG :${message}\n`);
  }

  async privmsg(target: string, message: string): Promise<void> {
    await this._send(`PRIVMSG ${target} :${message}\n`);
  }
}

/**
const samples = [
  "foo bar baz asdf",
  ":coolguy foo bar baz asdf",
  "foo bar baz :asdf quux",
  "foo bar baz :",
  "foo bar baz ::asdf",
  ":coolguy foo bar baz :asdf quux",
  ":coolguy foo bar baz :  asdf quux ",
  ":coolguy PRIVMSG bar :lol :) ",
  ":coolguy foo bar baz :",
  ":coolguy foo bar baz :  ",
  "@a=b;c=32;k;rt=ql7 foo",
  "@a=b\\\\and\\nk;c=72\\s45;d=gh\\:764 foo",
  "@c;h=;a=b :quux ab   test cd",
  ":src JOIN #chan",
  ":src JOIN :#chan",
  ":src AWAY",
  ":src AWAY ",
  ":cool	guy foo bar baz",
  ":gravel.mozilla.org 432  #momo :Erroneous Nickname: Illegal characters",
  ":gravel.mozilla.org MODE #tckk +n ",
  ":services.esper.net MODE #foo-bar +o foobar  ",
];

for (const sample of samples) {
  const message = parse(sample);
  console.log(message);
}
**/
