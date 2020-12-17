<script>
	
	let DEBUG_LOADING = false;
	let DEBUG_MSG = false;
	let EDIT_FULL = false;

	import {slide} from 'svelte/transition';
	import {Event, EventType} from './Event.js';
	
	// keybinds
	document.addEventListener('keydown', e => {
		if (e.ctrlKey && e.key === 's') {
			e.preventDefault();
			handleStateSave();
		}
		if (e.ctrlKey && e.key === 'l') {
			e.preventDefault();
			upload();
		}
	});

	export let eventData = [ newEvent("") ];



	// state saving / loading
	let files;

	function handleStateSave() {
		download(JSON.stringify(eventData, null, " "), 'events.json', 'text/plain');
	}

	function download(content, fileName, contentType) {
		var a = document.createElement("a");
		var file = new Blob([content], {type:contentType});
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
	}

	// <input id="loadEvents" type="file" accept=".json" bind:files >
	function upload(content, fileName, contentType) {
		var a = document.getElementById("loadEvents");
		a.click();

		a.addEventListener('change', event => {
			handleStateLoad(event)
		});
	}

	function handleStateLoad() {
		fr.readAsText(files.item(0));
	}

	var fr = new FileReader();

	function normalizeDates(d) {
		return JSON.parse(JSON.stringify(d, null, ""));
	}

	fr.onload = function (e) {
		console.log(e);
		var result = JSON.parse(e.target.result);
		// var formatted = JSON.stringify(result, null, 2);
		eventData = result;
	}

	function newEvent(x) {
		return normalizeDates(new Event(x));
	}

	function handleAddNextEvent() {
		eventData[eventData.length-1].created = new Date();
		// eventData[0].created = new Date();
		eventData = [...eventData, newEvent("")];
		// eventData = [new Event(""), ...eventData];
	}

	function handleOnUse(index) {
		eventData[index].used = [...eventData[index].used, new Date()];
	}


	let delta = 0;
	let delta_since = new Date();
	
	setInterval(() => {
		// if (fuzzy_delta < minute) {
			// 	fuzzy_delta++;
		// }
		delta++;

		}, 1000);

	var minute = 60, //seconds
    hour = minute * 60,
    day = hour * 24,
    week = day * 7;

	function fuzzy(date, d) {
		var s = Math.abs((new Date().getTime() - new Date(date).getTime()) / 1000);
		s = Math.round(s);


		if(s <= 5)
			return 'just now';

		if(s <= minute)
			return 'less than a minute ago';

		if(s <= hour)
			return 'less than an hour ago';

		if(s <= day)
			return 'less than a day ago';

		// if(s <= week)
			return Math.round(s/day) + ' days ago';
		
		// return "hm";
	}

	function localeDate(date) {
		var options = { year: 'numeric', month: 'long', day: 'numeric' };
		// var options = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };
		return new Date(date).toLocaleDateString("en-US", options);
	}

</script>

<!-- State Saving / Loading -->

{#if DEBUG_LOADING}
	<button on:click={handleStateSave}>Save</button>
	<input type="file" accept=".json" bind:files >
	<button on:click={handleStateLoad}>Load</button>
	<hr>
	<!-- <button on:click={() => sort=0}>Sort 0</button> -->
{/if}
<input hidden={true} id="loadEvents" type="file" accept=".json" bind:files >

{#if DEBUG_MSG}
	Ctrl+S to save. Ctrl+L to load.
	<hr>
{/if}


<svelte:window/>

{#each eventData as e, i}
	{#if !e.hide}
	<div transition:slide >

	Name: <input type="text" bind:value={e.name}>
	
	{#if e.created}
		<!-- Created: {e.created} -->
		
		<!-- ({i}) -->

		<button on:click={() => handleOnUse(i)}>Use</button>
		
		{#if e.used[0]}
			Last used 
			{fuzzy(e.used[e.used.length-1], delta)}
			<!-- {localeDate(e.used[e.used.length-1])} -->
		{/if}
		
		<button on:click={()=>(e.hide=true)} >Hide</button>
		
		{#each e.used as u}
			<span>✔️</span>
		{/each}
		Starred: 
		<input type=checkbox bind:checked={e.starred}>

		<button
			class="{e.type === EventType.POMODORO ? 'selected' : ''}"
			on:click="{() => e.type = EventType.POMODORO}"
		>pomodoro</button>

		<button
			class="{e.type === EventType.SPRINT ? 'selected' : ''}"
			on:click="{() => e.type = EventType.SPRINT}"
		>sprint</button>


	{/if}
	</div>
	{/if}
{/each}

<br>
<button on:click={handleAddNextEvent}>Add</button>


<style>
	.selected {
		background-color: #a3a3a3;
		color: white;
	}
</style>