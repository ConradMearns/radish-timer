<script>
	import {slide} from 'svelte/transition';

	let tasks = [];

	var startTime;

	function handleButton() {
		times.push("Hello!");
		times = times;
	}

	function handleStart() {
		startTime = new Date();
		isInPomo = true;
	}

	let isInPomo = false;








	let c = 0;

	setInterval(() => {
		if (c > 0) c--;
	}, 1000);



	$: minutes = Math.floor(c / 60);
	$: minname = minutes > 1 ? "mins" : "min";
	$: seconds = Math.floor(c - minutes * 60)








	// function handleAsk() {
	Notification.requestPermission().then(function(result) {
		console.log(result);
	});
	// }


	// var img = '/to-do-notifications/img/icon-128.png';
	// var notification = new Notification('To do list', { body: text, icon: img });
	var text = 'HEY! Your task is now overdue.';
	var notification = new Notification('To do list', { body: text });


</script>




<input type="text" placeholder="Today, I am going to...">
<button>Add Item</button>

<br>




<h1>
{minutes}:{seconds}
</h1>

<br>
	
<!-- <button on:click={handleAsk}>
Ask
</button> -->


<style>
	div {
		padding: 0.5em 0;
		border-top: 1px solid #eee;
	}
</style>


{#if isInPomo}
	<button>Cancel</button>
{:else}
	<button>Start</button>
{/if}

<!-- 
{#each tasks as task}
	<div transition:slide>
		{task}
	</div>
{/each} -->