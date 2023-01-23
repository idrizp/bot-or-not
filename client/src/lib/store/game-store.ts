import { writable } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';

export interface Message {
	opponent: boolean;
	message: string;
}

let socket: Socket;

export let gameId = writable<string>();
export let messages = writable<Message[]>([]);
export let playing = writable(false);
export let isCurrentPlayer = writable(false);
export let role = writable('');
export let winner = writable('');

export function closeApi() {
	messages.set([]);
	playing.set(false);
	isCurrentPlayer.set(false);
	role.set('');
	winner.set('');
	gameId.set('');

	socket.close();
}

export function openApi() {
	socket = io(`ws${dev ? '' : 's'}://${env.PUBLIC_API_HOST}`);
	socket.on('connect', () => {
		console.log('Connected to API.');
	});
	socket.on('game-message', (message: Message) => {
		isCurrentPlayer.set(message.opponent);
		messages.update((messages) => [...messages, message]);
	});
	socket.on('game-start', (data: { id: string; role: string }) => {
		playing.set(true);
		gameId.set(data.id);
		role.set(data.role);
		if (data.role === 'human') {
			isCurrentPlayer.set(true);
		}
		messages.set([]);
	});
	socket.on('game-end', (data: { winner: string }) => {});
	socket.emit('queue');
}

export function castVote(gameId: string, human: boolean) {
	socket.emit('game-vote', {
		game: gameId,
		human
	});
}

export function sendMessage(gameId: string, message: string) {
	socket.emit('game-message', {
		game: gameId,
		message
	});
}
