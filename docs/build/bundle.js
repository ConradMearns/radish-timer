
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    const EventType = {
        POMODORO: 'pomodoro',
        SPRINT: 'sprint',
    };

    class Event {
        constructor(name="new event") {
            this.name = name;
            this.created = undefined;
            this.used = [];
            this.hide = false;
            this.starred = false;
            this.type = EventType.POMODORO;
        }
    }

    /* src/EventList.svelte generated by Svelte v3.31.0 */

    const { console: console_1 } = globals;
    const file = "src/EventList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	child_ctx[28] = list;
    	child_ctx[29] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    // (133:0) {#if DEBUG_LOADING}
    function create_if_block_4(ctx) {
    	let button0;
    	let t1;
    	let input;
    	let t2;
    	let button1;
    	let t4;
    	let hr;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Save";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Load";
    			t4 = space();
    			hr = element("hr");
    			add_location(button0, file, 133, 1, 2802);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json");
    			add_location(input, file, 134, 1, 2852);
    			add_location(button1, file, 135, 1, 2900);
    			add_location(hr, file, 136, 1, 2950);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, hr, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*handleStateSave*/ ctx[5], false, false, false),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[10]),
    					listen_dev(button1, "click", /*handleStateLoad*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(hr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(133:0) {#if DEBUG_LOADING}",
    		ctx
    	});

    	return block;
    }

    // (142:0) {#if DEBUG_MSG}
    function create_if_block_3(ctx) {
    	let t;
    	let hr;

    	const block = {
    		c: function create() {
    			t = text("Ctrl+S to save. Ctrl+L to load.\n\t");
    			hr = element("hr");
    			add_location(hr, file, 143, 1, 3147);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, hr, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(142:0) {#if DEBUG_MSG}",
    		ctx
    	});

    	return block;
    }

    // (151:1) {#if !e.hide}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let input;
    	let t1;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[12].call(input, /*each_value*/ ctx[28], /*i*/ ctx[29]);
    	}

    	let if_block = /*e*/ ctx[27].created && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Name: ");
    			input = element("input");
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(input, "type", "text");
    			add_location(input, file, 153, 7, 3252);
    			add_location(div, file, 151, 1, 3220);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, input);
    			set_input_value(input, /*e*/ ctx[27].name);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", input_input_handler);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*eventData*/ 1 && input.value !== /*e*/ ctx[27].name) {
    				set_input_value(input, /*e*/ ctx[27].name);
    			}

    			if (/*e*/ ctx[27].created) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(151:1) {#if !e.hide}",
    		ctx
    	});

    	return block;
    }

    // (156:1) {#if e.created}
    function create_if_block_1(ctx) {
    	let button0;
    	let t1;
    	let t2;
    	let button1;
    	let t4;
    	let t5;
    	let input;
    	let t6;
    	let button2;
    	let t7;
    	let button2_class_value;
    	let t8;
    	let button3;
    	let t9;
    	let button3_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[13](/*i*/ ctx[29]);
    	}

    	let if_block = /*e*/ ctx[27].used[0] && create_if_block_2(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[14](/*e*/ ctx[27], /*each_value*/ ctx[28], /*i*/ ctx[29]);
    	}

    	let each_value_1 = /*e*/ ctx[27].used;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function input_change_handler_2() {
    		/*input_change_handler_2*/ ctx[15].call(input, /*each_value*/ ctx[28], /*i*/ ctx[29]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[16](/*e*/ ctx[27], /*each_value*/ ctx[28], /*i*/ ctx[29]);
    	}

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[17](/*e*/ ctx[27], /*each_value*/ ctx[28], /*i*/ ctx[29]);
    	}

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Use";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Hide";
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = text("\n\t\tStarred: \n\t\t");
    			input = element("input");
    			t6 = space();
    			button2 = element("button");
    			t7 = text("pomodoro");
    			t8 = space();
    			button3 = element("button");
    			t9 = text("sprint");
    			add_location(button0, file, 160, 2, 3366);
    			add_location(button1, file, 168, 2, 3560);
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 174, 2, 3680);

    			attr_dev(button2, "class", button2_class_value = "" + (null_to_empty(/*e*/ ctx[27].type === EventType.POMODORO
    			? "selected"
    			: "") + " svelte-1408av9"));

    			add_location(button2, file, 176, 2, 3730);

    			attr_dev(button3, "class", button3_class_value = "" + (null_to_empty(/*e*/ ctx[27].type === EventType.SPRINT
    			? "selected"
    			: "") + " svelte-1408av9"));

    			add_location(button3, file, 181, 2, 3873);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, input, anchor);
    			input.checked = /*e*/ ctx[27].starred;
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button2, anchor);
    			append_dev(button2, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button3, anchor);
    			append_dev(button3, t9);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler, false, false, false),
    					listen_dev(button1, "click", click_handler_1, false, false, false),
    					listen_dev(input, "change", input_change_handler_2),
    					listen_dev(button2, "click", click_handler_2, false, false, false),
    					listen_dev(button3, "click", click_handler_3, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*e*/ ctx[27].used[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*eventData*/ 1) {
    				const old_length = each_value_1.length;
    				each_value_1 = /*e*/ ctx[27].used;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = old_length; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (!each_blocks[i]) {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t5.parentNode, t5);
    					}
    				}

    				for (i = each_value_1.length; i < old_length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*eventData*/ 1) {
    				input.checked = /*e*/ ctx[27].starred;
    			}

    			if (dirty[0] & /*eventData*/ 1 && button2_class_value !== (button2_class_value = "" + (null_to_empty(/*e*/ ctx[27].type === EventType.POMODORO
    			? "selected"
    			: "") + " svelte-1408av9"))) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (dirty[0] & /*eventData*/ 1 && button3_class_value !== (button3_class_value = "" + (null_to_empty(/*e*/ ctx[27].type === EventType.SPRINT
    			? "selected"
    			: "") + " svelte-1408av9"))) {
    				attr_dev(button3, "class", button3_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(156:1) {#if e.created}",
    		ctx
    	});

    	return block;
    }

    // (163:2) {#if e.used[0]}
    function create_if_block_2(ctx) {
    	let t0;
    	let t1_value = /*fuzzy*/ ctx[9](/*e*/ ctx[27].used[/*e*/ ctx[27].used.length - 1], /*delta*/ ctx[2]) + "";
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Last used \n\t\t\t");
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*eventData, delta*/ 5 && t1_value !== (t1_value = /*fuzzy*/ ctx[9](/*e*/ ctx[27].used[/*e*/ ctx[27].used.length - 1], /*delta*/ ctx[2]) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(163:2) {#if e.used[0]}",
    		ctx
    	});

    	return block;
    }

    // (171:2) {#each e.used as u}
    function create_each_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "✔️";
    			add_location(span, file, 171, 3, 3640);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(171:2) {#each e.used as u}",
    		ctx
    	});

    	return block;
    }

    // (150:0) {#each eventData as e, i}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*e*/ ctx[27].hide && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!/*e*/ ctx[27].hide) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*eventData*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(150:0) {#each eventData as e, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let input;
    	let input_hidden_value;
    	let t1;
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*DEBUG_LOADING*/ ctx[3] && create_if_block_4(ctx);
    	let if_block1 = /*DEBUG_MSG*/ ctx[4] && create_if_block_3(ctx);
    	let each_value = /*eventData*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			input = element("input");
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			br = element("br");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Add";
    			input.hidden = input_hidden_value = true;
    			attr_dev(input, "id", "loadEvents");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json");
    			add_location(input, file, 139, 0, 3019);
    			add_location(br, file, 192, 0, 4040);
    			add_location(button, file, 193, 0, 4045);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t3, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler_1*/ ctx[11]),
    					listen_dev(button, "click", /*handleAddNextEvent*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*DEBUG_LOADING*/ ctx[3]) if_block0.p(ctx, dirty);

    			if (dirty[0] & /*eventData, fuzzy, delta, handleOnUse*/ 773) {
    				each_value = /*eventData*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t3.parentNode, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function download(content, fileName, contentType) {
    	var a = document.createElement("a");
    	var file = new Blob([content], { type: contentType });
    	a.href = URL.createObjectURL(file);
    	a.download = fileName;
    	a.click();
    }

    function normalizeDates(d) {
    	return JSON.parse(JSON.stringify(d, null, ""));
    }

    function localeDate(date) {
    	var options = {
    		year: "numeric",
    		month: "long",
    		day: "numeric"
    	};

    	// var options = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };
    	return new Date(date).toLocaleDateString("en-US", options);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EventList", slots, []);
    	let DEBUG_LOADING = false;
    	let DEBUG_MSG = false;
    	let EDIT_FULL = false;

    	// keybinds
    	document.addEventListener("keydown", e => {
    		if (e.ctrlKey && e.key === "s") {
    			e.preventDefault();
    			handleStateSave();
    		}

    		if (e.ctrlKey && e.key === "l") {
    			e.preventDefault();
    			upload();
    		}
    	});

    	let { eventData = [newEvent("")] } = $$props;

    	// state saving / loading
    	let files;

    	function handleStateSave() {
    		download(JSON.stringify(eventData, null, " "), "events.json", "text/plain");
    	}

    	// <input id="loadEvents" type="file" accept=".json" bind:files >
    	function upload(content, fileName, contentType) {
    		var a = document.getElementById("loadEvents");
    		a.click();

    		a.addEventListener("change", event => {
    			handleStateLoad();
    		});
    	}

    	function handleStateLoad() {
    		fr.readAsText(files.item(0));
    	}

    	var fr = new FileReader();

    	fr.onload = function (e) {
    		console.log(e);
    		var result = JSON.parse(e.target.result);

    		// var formatted = JSON.stringify(result, null, 2);
    		$$invalidate(0, eventData = result);
    	};

    	function newEvent(x) {
    		return normalizeDates(new Event(x));
    	}

    	function handleAddNextEvent() {
    		$$invalidate(0, eventData[eventData.length - 1].created = new Date(), eventData);

    		// eventData[0].created = new Date();
    		$$invalidate(0, eventData = [...eventData, newEvent("")]);
    	} // eventData = [new Event(""), ...eventData];

    	function handleOnUse(index) {
    		$$invalidate(0, eventData[index].used = [...eventData[index].used, new Date()], eventData);
    	}

    	let delta = 0;
    	let delta_since = new Date();

    	setInterval(
    		() => {
    			// if (fuzzy_delta < minute) {
    			// 	fuzzy_delta++;
    			// }
    			$$invalidate(2, delta++, delta);
    		},
    		1000
    	);

    	var minute = 60, hour = minute * 60, day = hour * 24, week = day * 7; //seconds

    	function fuzzy(date, d) {
    		var s = Math.abs((new Date().getTime() - new Date(date).getTime()) / 1000);
    		s = Math.round(s);
    		if (s <= 5) return "just now";
    		if (s <= minute) return "less than a minute ago";
    		if (s <= hour) return "less than an hour ago";
    		if (s <= day) return "less than a day ago";

    		// if(s <= week)
    		return Math.round(s / day) + " days ago";
    	} // return "hm";

    	const writable_props = ["eventData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<EventList> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		files = this.files;
    		$$invalidate(1, files);
    	}

    	function input_change_handler_1() {
    		files = this.files;
    		$$invalidate(1, files);
    	}

    	function input_input_handler(each_value, i) {
    		each_value[i].name = this.value;
    		$$invalidate(0, eventData);
    	}

    	const click_handler = i => handleOnUse(i);
    	const click_handler_1 = (e, each_value, i) => $$invalidate(0, each_value[i].hide = true, eventData);

    	function input_change_handler_2(each_value, i) {
    		each_value[i].starred = this.checked;
    		$$invalidate(0, eventData);
    	}

    	const click_handler_2 = (e, each_value, i) => $$invalidate(0, each_value[i].type = EventType.POMODORO, eventData);
    	const click_handler_3 = (e, each_value, i) => $$invalidate(0, each_value[i].type = EventType.SPRINT, eventData);

    	$$self.$$set = $$props => {
    		if ("eventData" in $$props) $$invalidate(0, eventData = $$props.eventData);
    	};

    	$$self.$capture_state = () => ({
    		DEBUG_LOADING,
    		DEBUG_MSG,
    		EDIT_FULL,
    		slide,
    		Event,
    		EventType,
    		eventData,
    		files,
    		handleStateSave,
    		download,
    		upload,
    		handleStateLoad,
    		fr,
    		normalizeDates,
    		newEvent,
    		handleAddNextEvent,
    		handleOnUse,
    		delta,
    		delta_since,
    		minute,
    		hour,
    		day,
    		week,
    		fuzzy,
    		localeDate
    	});

    	$$self.$inject_state = $$props => {
    		if ("DEBUG_LOADING" in $$props) $$invalidate(3, DEBUG_LOADING = $$props.DEBUG_LOADING);
    		if ("DEBUG_MSG" in $$props) $$invalidate(4, DEBUG_MSG = $$props.DEBUG_MSG);
    		if ("EDIT_FULL" in $$props) EDIT_FULL = $$props.EDIT_FULL;
    		if ("eventData" in $$props) $$invalidate(0, eventData = $$props.eventData);
    		if ("files" in $$props) $$invalidate(1, files = $$props.files);
    		if ("fr" in $$props) fr = $$props.fr;
    		if ("delta" in $$props) $$invalidate(2, delta = $$props.delta);
    		if ("delta_since" in $$props) delta_since = $$props.delta_since;
    		if ("minute" in $$props) minute = $$props.minute;
    		if ("hour" in $$props) hour = $$props.hour;
    		if ("day" in $$props) day = $$props.day;
    		if ("week" in $$props) week = $$props.week;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		eventData,
    		files,
    		delta,
    		DEBUG_LOADING,
    		DEBUG_MSG,
    		handleStateSave,
    		handleStateLoad,
    		handleAddNextEvent,
    		handleOnUse,
    		fuzzy,
    		input_change_handler,
    		input_change_handler_1,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		input_change_handler_2,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class EventList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { eventData: 0 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EventList",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get eventData() {
    		throw new Error("<EventList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set eventData(value) {
    		throw new Error("<EventList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.31.0 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let eventlist;
    	let t0;
    	let h3;
    	let current;
    	eventlist = new EventList({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(eventlist.$$.fragment);
    			t0 = space();
    			h3 = element("h3");
    			h3.textContent = "Autosaving is not available yet - save your work!";
    			attr_dev(h3, "class", "svelte-15hh25p");
    			add_location(h3, file$1, 14, 0, 121);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(eventlist, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h3, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(eventlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(eventlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(eventlist, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ EventList });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
