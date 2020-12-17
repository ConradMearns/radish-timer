<script>
// timer

	let c = 15;

	setInterval(() => {
        if (c > 0) c--;
	}, 1000);

	$: minutes = Math.floor(c / 60);
	$: minname = minutes > 1 ? "mins" : "min";
	$: seconds = Math.floor(c - minutes * 60)

	function handleStart() {
        c = 20*60;
	}


// state machine

const seasons = {
    SUMMER: 'summer',
    WINTER: 'winter',
    SPRING: 'spring',
    AUTUMN: 'autumn'
}

let season = seasons.WINTER;


</script>


<!-- TIMER -->
<h1>
{minutes}:{(seconds > 9 ? seconds : "0"+seconds)}
</h1>

<br>

<button on:click={handleStart}>start</button>

<!-- END TIMER -->
