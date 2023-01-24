<script lang="ts">
	import {
		closeApi,
		gameId,
		isCurrentPlayer,
		messages,
		role,
		openApi,
		playing,
		castVote as castServerVote,
		sendMessage as sendServerMessage,
		winner
	} from '$lib/store/game-store';
	import { onMount } from 'svelte';
	import Spinner from './Spinner.svelte';

	let currentMessage: string;

	function sendMessage() {
		if (currentMessage === '') return;
		if (currentMessage.length > 100) return;
		sendServerMessage($gameId, currentMessage);
		currentMessage = '';
	}

	function castVote(human: boolean) {
		castServerVote($gameId, human);
	}

	$: canSendMessage = $isCurrentPlayer;

	onMount(() => {
		openApi();
		return () => closeApi();
	});
</script>

{#if !$playing}
	<main class="flex-1 flex flex-col place-items-center place-content-center mx-6 tracking-tight">
		<Spinner />
		<p class="text-white text-center font-medium">
			Waiting to find a match... (don't believe the spinner, this could just be readying the bot!)
		</p>
	</main>
{:else if $winner === ''}
	<main class="flex-1 flex flex-col text-white">
		<div class="p-6 bg-gray-800 text-center">
			<p class="font-bold">
				You are a <span
					class="uppercase"
					class:text-red-500={$role === 'bot'}
					class:text-blue-500={$role === 'human'}
					>{$role}
					{#if $role === 'bot'} 🤖{:else} 😀{/if}.</span
				>
			</p>
		</div>
		<div class="flex-1 flex flex-col mx-6 mt-10">
			{#each $messages as message}
				{#if !message.opponent}
					<p
						class="self-end p-3 sm:p-2 rounded-full mt-2 bg-green-600"
						class:bg-red-500={$role === 'bot'}
					>
						{message.message}
					</p>
				{:else}
					<p class="self-start bg-blue-500 p-3 sm:p-2 rounded-full mt-2">{message.message}</p>
				{/if}
			{/each}
		</div>
		{#if $role === 'human'}
			<div>
				<p class="text-center font-medium text-gray-400">Cast your vote:</p>
				<div class="flex flex-row justify-center items-center m-6 space-x-2">
					<button class="flex-1 py-5 px-6 bg-red-500 rounded-md" on:click={() => castVote(false)}
						>Robot</button
					>
					<button class="flex-1 py-5 px-6 bg-blue-600 rounded-md" on:click={() => castVote(true)}
						>Human</button
					>
				</div>
			</div>
		{:else}
			<p class="mx-6 my-5 text-gray-400">
				Hint: Say something to the effect of "I can't answer that." from time to time. Make yourself
				extremely pedantic and look after your grammar.
			</p>
		{/if}
		<form class="flex flex-row mx-3 mb-10 justify-between">
			<input
				disabled={!canSendMessage}
				class="bg-gray-800 flex-1 p-5 rounded-l-full focus:outline-none"
				maxlength="100"
				class:rounded-r-full={!canSendMessage}
				bind:value={currentMessage}
				placeholder={canSendMessage ? 'Write a message...' : 'Waiting for opponent...'}
			/>
			<button
				class="hover:cursor-pointer pr-5 rounded-r-full bg-gray-800"
				class:hidden={!canSendMessage}
				on:click={(e) => {
					e.preventDefault();
					if (!canSendMessage) return;
					sendMessage();
				}}
				type="submit"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
					/>
				</svg>
			</button>
		</form>
	</main>
{:else}
	<main class="flex-1 flex flex-col place-items-center place-content-center mx-6 tracking-tight">
		<p class="text-white text-center font-medium text-4xl mb-10">
			<span
				class="font-bold uppercase"
				class:text-red-500={$winner === 'bot' || $winner === 'bot-human'}
				class:text-blue-500={$winner === 'human'}
			>
				{#if $winner === 'bot'}
					🤖 ROBOT
				{:else if $winner === 'bot-human'}
					🤖 ROBOT - played by another human -
				{:else}
					😀 HUMAN
				{/if}
			</span>
			wins!
		</p>
		<button class="button" on:click={() => window.location.reload()}>Play again</button>
	</main>
{/if}
