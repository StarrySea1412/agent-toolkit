(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  var termLine = function (el, html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  };

  /* ═══ 互动 01 · 点单台 ═══ */
  (function d1() {
    var STEPS = [
      { actor: "运行时 → 模型", ctx: 3, act: "读菜单+问题", text: '<span class="c">[运行时把工具菜单(13条)与用户问题塞进上下文]</span>\n用户：给文章生成一张柴犬工程师配图，要两张' },
      { actor: "模型 → 运行时", ctx: 4, act: "吐点单 JSON", text: '<span class="c">[模型输出的只是文本——点单原样]</span>\n{ "tool": "generate_image",\n  "arguments": { "prompt": "戴工程师帽的柴犬", "count": 2 } }' },
      { actor: "运行时 → 工具台", ctx: 4, act: "校验并执行", text: '<span class="c">[运行时代码校验 schema：count 1-4 ✓ prompt ≤12000 ✓]</span>\n[执行] POST /generations → 任务 g_8f3a, g_8f3b 已入列' },
      { actor: "运行时 → 模型", ctx: 5, act: "结果回填", text: '<span class="c">[结果作为新消息回填——模型这才能「看见」]</span>\n{ "images": ["/img/g_8f3a.png", "/img/g_8f3b.png"] }' },
      { actor: "模型 → 用户", ctx: 5, act: "续答", text: '<span class="ok">两张图生成好了：</span> /img/g_8f3a.png（柴犬正面）/img/g_8f3b.png（侧写）——<span class="c">此后它才有资格谈论这张图</span>' }
    ];
    var step = 0;
    function paint(mode) {
      var t = $("#d1-term");
      if (mode === "fail") {
        termLine(t, '<span class="e">[故障] 运行时执行完，结果忘了回填</span>');
        termLine(t, '<span class="c">[模型侧上下文仍停在点单后——它不知道执行发生过]</span>');
        termLine(t, '<span class="e">模型下一轮把同一份点单原样再吐一遍：</span> { "tool": "generate_image", … }');
        $("#d1-step").textContent = "回填失败"; $("#d1-act").textContent = "失忆重试";
        return;
      }
      if (step === 0) t.innerHTML = "";
      if (step >= STEPS.length) { $("#d1-step").textContent = "完成 ✓"; return; }
      var s = STEPS[step];
      termLine(t, '<span class="p">▸ 第' + (step + 1) + "步 · " + s.actor + "</span>");
      termLine(t, esc(s.text).split("\n").join("<br>"));
      $("#d1-step").textContent = (step + 1) + "/5 · " + s.actor.split(" ")[0];
      $("#d1-ctx").textContent = s.ctx + " 条";
      $("#d1-act").textContent = s.act;
      step++;
    }
    $("#d1-next").addEventListener("click", function () { paint(); });
    $("#d1-fail").addEventListener("click", function () { paint("fail"); });
    $("#d1-reset").addEventListener("click", function () {
      step = 0;
      $("#d1-term").innerHTML = '<span class="c"># 点「下一步」走一回合；点单与回填均为原样 JSON</span>';
      $("#d1-step").textContent = "—"; $("#d1-ctx").textContent = "1"; $("#d1-act").textContent = "等输入";
    });
  })();

  /* ═══ 互动 02 · 握手时序台 ═══ */
  (function d2() {
    var MSGS = [
      { dir: "up", title: "① initialize（必须先发的暗号）", state: "握手请求", tools: 0, text: '{ "jsonrpc": "2.0", "id": 1, "method": "initialize",\n  "params": { "protocolVersion": "2025-06-18",\n    "capabilities": { "tools": {} }, "clientInfo": { "name": "harness", "version": "1.0" } } }' },
      { dir: "down", title: "② initialize 响应（就高不就低锁版本）", state: "已握手", tools: 0, text: '{ "jsonrpc": "2.0", "id": 1, "result": {\n  "protocolVersion": "2025-06-18",\n  "serverInfo": { "name": "ai-image-studio", "version": "0.1.0" },\n  "capabilities": { "tools": {} } } }' },
      { dir: "up", title: "③ notifications/initialized（通知，无 id）", state: "就绪", tools: 0, text: '{ "jsonrpc": "2.0", "method": "notifications/initialized" }  <span class="c">// 说完就走，不需回应</span>' },
      { dir: "up", title: "④ tools/list（拉菜单）", state: "就绪", tools: 0, text: '{ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }' },
      { dir: "down", title: "⑤ 菜单返回（13 个工具 + 各自 schema）", state: "菜单在侧", tools: 13, text: '{ "jsonrpc": "2.0", "id": 2, "result": { "tools": [\n  { "name": "generate_image",  <span class="c">…schema 详见第三章</span> },\n  { "name": "inspect_image" }, { "name": "search_library" }, <span class="c">… 共 13 个</span> ] } }' },
      { dir: "up", title: "⑥ tools/call（下单，id=3）", state: "调用中", tools: 13, text: '{ "jsonrpc": "2.0", "id": 3, "method": "tools/call",\n  "params": { "name": "generate_image",\n    "arguments": { "prompt": "戴工程师帽的柴犬", "count": 2 } } }' },
      { dir: "down", title: "⑦ 工具结果（isError=false 成功回填）", state: "回合完成", tools: 13, text: '{ "jsonrpc": "2.0", "id": 3, "result": {\n  "isError": false, "content": [ { "type": "text",\n    "text": "{ \\"submitted\\": [\\"g_8f3a\\", \\"g_8f3b\\"] … }" } ] } }' }
    ];
    var i = 0;
    $("#d2-next").addEventListener("click", function () {
      if (i >= MSGS.length) return;
      var m = MSGS[i], t = $("#d2-term");
      if (i === 0) t.innerHTML = "";
      termLine(t, (m.dir === "up" ? '<span class="p">↑ 客户端</span>' : '<span class="ok">↓ server</span>') + " <b>" + m.title + "</b>");
      termLine(t, esc(m.text).split("\n").join("<br>"));
      $("#d2-msg").textContent = "#" + (i + 1) + (m.dir === "up" ? " ↑" : " ↓");
      $("#d2-state").textContent = m.state;
      $("#d2-tools").textContent = m.tools;
      i++;
    });
    $("#d2-skip").addEventListener("click", function () {
      var t = $("#d2-term"); t.innerHTML = "";
      termLine(t, '<span class="e">↑ 客户端（跳过握手，上来就点菜）</span> <b>直接发 tools/call</b>');
      termLine(t, '{ "jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": { … } }');
      termLine(t, '<span class="e">↓ server</span> { "jsonrpc": "2.0", "id": 9, "error": { "code": -32002,');
      termLine(t, '<span class="e">  "message": "Server not initialized —— 没登记不准点菜" } }</span>');
      termLine(t, '<span class="c"># 连接按协议终止：菜单都没得拉，所有 id 作废</span>');
      $("#d2-msg").textContent = "#9 ↓"; $("#d2-state").textContent = "已断连"; $("#d2-tools").textContent = "0";
    });
    $("#d2-reset").addEventListener("click", function () {
      i = 0;
      $("#d2-term").innerHTML = '<span class="c"># 点「下一步」逐条走；上行=客户端发出，下行=server 回应</span>';
      $("#d2-msg").textContent = "—"; $("#d2-state").textContent = "未连接"; $("#d2-tools").textContent = "0";
    });
  })();

  /* ═══ 互动 03 · 校验器（真校验，与标本 zod 规则一致）═══ */
  (function d3() {
    var CASES = {
      ok:   { args: { prompt: "戴工程师帽的柴犬", count: 2 } },
      miss: { args: { count: 2 } },
      range: { args: { prompt: "柴犬", count: 17 } },
      type: { args: { prompt: "柴犬", count: "很多" } }
    };
    function validate(a) {
      if (typeof a.prompt !== "string" || a.prompt.length < 1 || a.prompt.length > 12000)
        return { field: "prompt", msg: "prompt：期望字符串且长度 1–12000，实际 " + (a.prompt === undefined ? "缺失" : JSON.stringify(a.prompt).slice(0, 30) + (a.prompt.length > 12000 ? "（超长）" : "")) };
      if (a.count !== undefined) {
        if (typeof a.count !== "number" || !isFinite(a.count) || Math.floor(a.count) !== a.count)
          return { field: "count", msg: "count：期望整数（number），实际收到 " + JSON.stringify(a.count) + "（字符串）——类型漂移" };
        if (a.count < 1 || a.count > 4)
          return { field: "count", msg: "count：期望整数 1–4，实际收到 17 —— 越界值，按 17 张计费会炸" };
      }
      if (a.waitSeconds !== undefined && (typeof a.waitSeconds !== "number" || a.waitSeconds < 5 || a.waitSeconds > 600))
        return { field: "waitSeconds", msg: "waitSeconds：期望整数 5–600，实际 " + JSON.stringify(a.waitSeconds) };
      return null;
    }
    document.querySelectorAll("#d3 .btn-row .btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.id.slice(3), t = $("#d3-term"), c = CASES[key], err = validate(c.args);
        t.innerHTML = "";
        termLine(t, '<span class="p">tools/call → generate_image</span>  参数：' + esc(JSON.stringify(c.args)));
        if (!err) {
          termLine(t, '<span class="ok">✔ 闸门放行 → 执行 POST /generations</span>');
          $("#d3-verdict").textContent = "放行 ✓"; $("#d3-verdict").className = "okc";
          $("#d3-field").textContent = "—"; $("#d3-fix").textContent = "—";
        } else {
          termLine(t, '<span class="e">✕ isError:true</span>  { "code": "INVALID_ARGS", "message":\n  "' + esc(err.msg) + '" }');
          termLine(t, '<span class="c"># 三要素齐了：字段名 + 期望 + 实际 —— 模型下一轮自己就能改单</span>');
          $("#d3-verdict").textContent = "拦截 ✕"; $("#d3-verdict").className = "badc";
          $("#d3-field").textContent = err.field;
          $("#d3-fix").textContent = "能（三要素齐全）";
        }
      });
    });
  })();

  /* ═══ 互动 04 · 队列台 ═══ */
  (function d4() {
    var jobs = [], polls = 0, synced = false, tick = 0;
    function state(now) { return now === 0 ? "queued" : now === 1 ? "running" : "succeeded"; }
    function paintTerm(t) {
      t.innerHTML = "";
      jobs.forEach(function (j) {
        var s = state(j.progress), mark = s === "succeeded" ? '<span class="ok">✔</span> ' : s === "running" ? '<span class="p">⏳</span> ' : '<span class="c">·</span> ';
        termLine(t, mark + j.id + " · " + s + (s === "succeeded" ? " → /img/" + j.id + ".png" : ""));
      });
    }
    $("#d4-async").addEventListener("click", function () {
      jobs = [{ id: "g_a1", progress: 0 }, { id: "g_a2", progress: 0 }, { id: "g_a3", progress: 0 }, { id: "g_a4", progress: 0 }];
      synced = false; polls = 0; tick = 0;
      var t = $("#d4-term"); t.innerHTML = "";
      termLine(t, '<span class="p">wait=false 提交 4 张</span> → 立刻回票：');
      termLine(t, '{ "submitted": ["g_a1","g_a2","g_a3","g_a4"],\n  "hint": <span class="s">"用 get_generation 查询进度"</span> }');
      termLine(t, '<span class="c"># 通道没挂死——按「轮询」逐次看进度（每按一次 = 2s）</span>');
      $("#d4-state").textContent = "4 张排队"; $("#d4-done").textContent = "0 / 4";
    });
    $("#d4-poll").addEventListener("click", function () {
      if (!jobs.length) return;
      polls++; tick++;
      jobs.forEach(function (j, idx) { if (tick >= idx) j.progress = Math.min(2, j.progress + 1); });
      paintTerm($("#d4-term"));
      var done = jobs.filter(function (j) { return state(j.progress) === "succeeded"; }).length;
      $("#d4-polls").textContent = polls + " 次（2s/次）";
      $("#d4-state").textContent = done === jobs.length ? "全部完成 ✓" : "进行中";
      $("#d4-done").textContent = done + " / " + jobs.length;
    });
    $("#d4-sync").addEventListener("click", function () {
      synced = true; polls = 0;
      var t = $("#d4-term"); t.innerHTML = "";
      jobs = [{ id: "g_s1", progress: 0 }];
      termLine(t, '<span class="p">wait=true 同步等 1 张</span>（轮询 2s/次，默认 240s，上限 600s）');
      var steps = 0;
      var iv = setInterval(function () {
        steps++; polls = steps;
        termLine(t, '<span class="c">poll #' + steps + ' · ' + (steps * 2) + 's · ' + state(Math.min(2, steps)) + '</span>');
        $("#d4-polls").textContent = steps + " 次";
        if (steps === 12) {
          clearInterval(iv);
          termLine(t, '<span class="e">⏱ 达到同步等待上限（模拟刻度 24s / 真机 600s）</span>');
          termLine(t, '{ <b>"timedOut": true</b>, "hint": <span class="s">"仍在生成中，稍后用 get_generation 查询"</span> }');
          termLine(t, '<span class="c"># 如实认输并递票——通道释放，任务还在跑</span>');
          $("#d4-state").textContent = "超时，票已递";
        }
        if (steps === 20) { clearInterval(iv); termLine(t, '<span class="ok">✔ 稍后查询：succeeded → /img/g_s1.png</span>'); $("#d4-state").textContent = "后续查询拿到图 ✓"; }
      }, 350);
    });
    $("#d4-reset").addEventListener("click", function () {
      jobs = []; polls = 0;
      $("#d4-term").innerHTML = '<span class="c"># 先提交，再轮询；注意 hint 与 timedOut 的出现时机</span>';
      $("#d4-state").textContent = "空"; $("#d4-polls").textContent = "0"; $("#d4-done").textContent = "0 / 0";
    });
  })();

  /* ═══ 互动 05 · 错误对照台 ═══ */
  (function d5() {
    var SHOW = {
      proto: {
        layer: "协议层", reader: "客户端代码", hint: "无（断连）", text:
          '<span class="e">↓ { "jsonrpc": "2.0", "id": 9, "error": { "code": -32002,</span>\n<span class="e">  "message": "Server not initialized" } }</span>\n<span class="c"># 没握手先点菜 —— 数字码给代码分流，断连处理，模型看不见这份报文</span>'
      },
      biz: {
        layer: "工具层", reader: "模型（isError:true）", hint: "带（重试或换型号）", text:
          '<span class="p">tools/call → generate_image</span>\n{ "isError": <b>true</b>, "content": [ { "type": "text", "text":\n  <span class="s">"上游过载（CPU 99.7%）。约 1–5 分钟后可重试，或换 gpt-image-2.6-flare。"</span> } ] }\n<span class="c"># 调用链路是通的——失败的是业务；模型把这段当坏结果读，自己挑岔路</span>'
      },
      heal: {
        layer: "自愈层", reader: "先运行时，失败才上交", hint: "带（含地址现场）", text:
          '<span class="c">[请求抛错：连接被拒]</span>\n<span class="p">[自愈] 清缓存 baseUrl → 重新发现服务 → 再试一次（attempt=1）</span>\n<span class="ok">✔ 第二次成功 —— 模型全程无感</span>\n<span class="c"># 若第二次仍失败 → throw 无法连接画境服务（https://…）——现场完整上交</span>'
      }
    };
    document.querySelectorAll("#d5 .btn-row .btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.id === "d5-reset") { $("#d5-term").innerHTML = '<span class="c"># 点一种失败，看它在哪一层被接住、说了什么人话</span>'; $("#d5-layer").textContent = "—"; $("#d5-reader").textContent = "—"; $("#d5-hint").textContent = "—"; return; }
        var s = SHOW[b.id.slice(3)], t = $("#d5-term"); t.innerHTML = "";
        s.text.split("\n").forEach(function (l) { termLine(t, l); });
        $("#d5-layer").textContent = s.layer; $("#d5-reader").textContent = s.reader; $("#d5-hint").textContent = s.hint;
      });
    });
  })();

  /* ═══ 互动 06 · 粒度对比台 ═══ */
  (function d6() {
    var TASKS = [
      { t: "复现这张图的同款", one: "inspect_image(mode=recreate)", three: "recreate_image" },
      { t: "蒸馏成风格模板，换主体批量出", one: "inspect_image(mode=variation)", three: "variation_image" },
      { t: "反推这张图的拍摄机位", one: "inspect_image(mode=position)", three: "position_image" }
    ];
    var MODE = { cost: "约 620 字", hit: "3 / 3", jump: "2 跳（先选工具再想 mode）" };
    var MODE3 = { cost: "约 780 字（公共描述 ×3）", hit: "3 / 3", jump: "1 跳（意图直连工具名）" };
    var cur = "one";
    function chip(onId) {
      $("#d6-m1").classList.toggle("on", onId === "m1");
      $("#d6-m3").classList.toggle("on", onId === "m3");
    }
    $("#d6-m1").addEventListener("click", function () { cur = "one"; chip("m1"); paintStats(); });
    $("#d6-m3").addEventListener("click", function () { cur = "three"; chip("m3"); paintStats(); });
    function paintStats() {
      var s = cur === "one" ? MODE : MODE3;
      $("#d6-cost").textContent = s.cost; $("#d6-hit").textContent = s.hit; $("#d6-jump").textContent = s.jump;
    }
    $("#d6-run").addEventListener("click", function () {
      var t = $("#d6-term"); t.innerHTML = "";
      termLine(t, '<span class="c">[菜单常驻上下文：' + (cur === "one" ? "1 段公共描述 + mode 枚举" : "3 份独立描述") + ']</span>');
      TASKS.forEach(function (x, i) {
        termLine(t, '<span class="p">任务 ' + (i + 1) + '</span> ' + x.t);
        termLine(t, '  → 选单：' + (cur === "one" ? x.one + (i ? '' : '  <span class="c">← 两跳：选完工具还要定 mode</span>') : x.three + '  <span class="c">← 一跳直达</span>'));
      });
      var s = cur === "one" ? MODE : MODE3;
      termLine(t, '<span class="c"># 账：菜单 ' + s.cost + " · 选对 " + s.hit + " · " + s.jump + '</span>');
    });
    $("#d6-reset").addEventListener("click", function () {
      cur = "one"; chip("m1"); paintStats();
      $("#d6-term").innerHTML = '<span class="c"># 三个任务：复现同款 / 蒸馏风格模板 / 反推机位——确定性选单模拟</span>';
    });
    paintStats();
  })();
})();
