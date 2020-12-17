
<!-- LIST -->

<input bind:value={newItem} type="text" placeholder="new todo item..">
<button on:click={addToList}>add</button>

<br/>

{#each todoList as item, index}
	<!-- <input bind:checked={item.status} type="checkbox"> -->
	<div transition:slide >
	{item.text}

	<span on:click={() => removeFromList(index)}>❌</span>
	<span on:click={() => increment(index)}>+</span>

	{#each Array(item.status) as x}
		<span>✔️</span>
	{/each}

	</div>
	<br/>
{/each} 

<!-- END LIST -->