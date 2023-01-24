<script lang="ts">
	import { onMount } from 'svelte';
	import Game from '../lib/components/Game.svelte';

	let playing = false;
</script>

<main class="flex flex-col min-h-screen">
	{#if !playing}
		<section
			class="flex-1 flex flex-col place-items-center place-content-center mx-6 tracking-tight"
		>
			<h1 class="text-white text-4xl font-bold text-center">🤖 bot or not</h1>
			<div class="text-gray-500 mt-10 self-start space-y-2 md:self-center">
				<p class="text-lg text-gray-400">How to play:</p>
				<p>1. There's a 50% chance you have to impersonate a bot, or be a player.</p>
				<p>
					2. In the case you're a player, you have to figure out if the person chatting to you is a
					bot.
				</p>
				<p>3. In the case you're a bot, you have to make the player believe you are one.</p>
			</div>
			<button class="button mt-10 w-1/2" on:click={() => (playing = true)}>play</button>
		</section>
	{:else}
		<Game />
	{/if}
	<footer class="bg-gray-800 p-5 sm:space-y-0 items-center sm:flex flex-row justify-between">
		<p class="text-white">
			made by idriz pelaj - <a href="https://idriz.dev" target="_blank" rel="noreferrer"
				>https://idriz.dev</a
			>
		</p>
		<a
			href="https://www.buymeacoffee.com/idriz"
			class="mt-2 sm:mt-0"
			target="_blank"
			rel="noreferrer"
			><img
				src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
				alt="Buy Me A Coffee"
				style="height: 60px !important;width: 217px !important;"
			/></a
		>
	</footer>
</main>

<style lang="postcss">
	:global(body) {
		@apply bg-gray-900;
	}
	:global(.button) {
		@apply bg-blue-500 rounded-md text-white px-5 py-2 font-medium focus:outline-blue-600 focus:outline-2;
	}
	:global(.button-unavailable) {
		@apply bg-gray-500 rounded-md text-white px-5 py-2 font-medium focus:outline-blue-600 focus:outline-2;
	}
</style>
