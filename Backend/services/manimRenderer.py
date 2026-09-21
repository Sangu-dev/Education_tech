import os
import sys
import json
import shutil
import numpy as np

# Ensure FFmpeg is in PATH
try:
    import imageio_ffmpeg
    ffmpeg_dir = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
    os.environ['PATH'] = ffmpeg_dir + os.pathsep + os.environ.get('PATH', '')
except Exception:
    pass

bin_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'bin'))
if os.path.exists(bin_dir):
    os.environ['PATH'] = bin_dir + os.pathsep + os.environ.get('PATH', '')

from manim import *

# Set production configuration: Crisp 720p at 24fps
config.quality = "medium_quality"
config.pixel_height = 720
config.pixel_width = 1280
config.frame_rate = 24
config.background_color = "#070B14"  # Deep premium dark background

def sanitize_text(text, max_len=45):
    """Sanitize text for clean Manim Text rendering"""
    if not text:
        return ""
    clean = str(text).replace("\n", " ").strip()
    if len(clean) > max_len:
        return clean[:max_len - 3] + "..."
    return clean

def render_scene_to_file(scene_json, output_mp4):
    """
    Renders an educational scene with synchronized step-by-step animations
    matching the exact audio narration duration.
    """
    diagram_type = str(scene_json.get('diagram_type', 'concept_map')).lower()
    diagram_data = scene_json.get('diagram_data', {})
    title_text = sanitize_text(scene_json.get('title', 'Educational Lesson'), max_len=40)
    total_duration = max(3.5, float(scene_json.get('duration', 6.0)))
    keywords = [sanitize_text(k, 18) for k in scene_json.get('important_keywords', []) if k][:4]
    on_screen_text = [sanitize_text(t, 25) for t in scene_json.get('on_screen_text', []) if t]
    animation_steps = [sanitize_text(s, 50) for s in scene_json.get('animation_steps', []) if s]
    visual_desc = sanitize_text(scene_json.get('visual_description', ''), max_len=55)

    class DynamicEducationalScene(Scene):
        def construct(self):
            # Calculate dynamic step-by-step pacing
            # Reserve 1.0s for header, 1.2s for footer chips
            available_time = max(1.5, total_duration - 2.2)

            # 1. Header Title Banner (1.0s)
            header = Text(title_text, font_size=34, color="#38BDF8", weight=BOLD)
            header.to_edge(UP, buff=0.55)
            underline = Line(LEFT * 5.5, RIGHT * 5.5, color="#818CF8", stroke_width=2.5).next_to(header, DOWN, buff=0.18)
            
            # Badge for diagram type
            type_label = Text(f"• {diagram_type.replace('_', ' ').upper()}", font_size=16, color="#A78BFA", weight=BOLD)
            type_box = SurroundingRectangle(type_label, color="#4C1D95", fill_color="#1E1B4B", fill_opacity=0.7, corner_radius=0.15, buff=0.1)
            type_badge = VGroup(type_box, type_label).next_to(header, RIGHT, buff=0.4)

            self.play(
                FadeIn(header, shift=DOWN * 0.25),
                Create(underline),
                FadeIn(type_badge, shift=LEFT * 0.2),
                run_time=0.9
            )

            # 2. Render specific diagram with progressive reveal
            step_count = max(len(animation_steps), 3)
            time_per_step = available_time / step_count

            if diagram_type in ['ml_pipeline', 'process', 'pipeline']:
                self.build_pipeline(diagram_data, on_screen_text, animation_steps, available_time)
            elif diagram_type == 'neural_network':
                self.build_neural_network(diagram_data, available_time)
            elif diagram_type in ['sorting', 'algorithm']:
                self.build_sorting(diagram_data, available_time)
            elif diagram_type in ['comparison', 'table']:
                self.build_comparison(diagram_data, available_time)
            elif diagram_type == 'timeline':
                self.build_timeline(diagram_data, available_time)
            elif diagram_type in ['flowchart', 'decision']:
                self.build_flowchart(diagram_data, on_screen_text, available_time)
            elif diagram_type in ['architecture', 'system']:
                self.build_architecture(diagram_data, available_time)
            elif diagram_type in ['formula', 'math']:
                self.build_formula(title_text, on_screen_text, available_time)
            elif diagram_type in ['code_execution', 'code']:
                self.build_code(on_screen_text, available_time)
            else:
                self.build_concept_map(title_text, keywords, on_screen_text, animation_steps, available_time)

            # 3. Footer Takeaway & Keywords (1.2s)
            chips = VGroup()
            if keywords:
                for kw in keywords[:3]:
                    txt = Text(f"✦ {kw}", font_size=18, color="#E2E8F0", weight=SEMIBOLD)
                    box = RoundedRectangle(corner_radius=0.15, height=0.55, width=txt.width + 0.45,
                                           color="#6366F1", fill_color="#1E1B4B", fill_opacity=0.85, stroke_width=1.5)
                    chips.add(VGroup(box, txt))
            elif visual_desc:
                desc_txt = Text(visual_desc, font_size=18, color="#94A3B8")
                chips.add(desc_txt)

            if len(chips) > 0:
                chips.arrange(RIGHT, buff=0.35).to_edge(DOWN, buff=0.45)
                self.play(FadeIn(chips, shift=UP * 0.2), run_time=0.8)
                self.wait(max(0.2, total_duration - self.time))
            else:
                remaining = total_duration - self.time
                if remaining > 0.1:
                    self.wait(remaining)

        # ── Visual Builders with Synchronized Progression ────────────────────────

        def build_pipeline(self, data, text_items, steps_desc, total_time):
            raw_steps = data.get('steps') or text_items or ["Data Ingestion", "Feature Transform", "Model Train", "Inference"]
            items = [sanitize_text(s, 16) for s in raw_steps][:4]
            num = len(items)
            step_duration = total_time / max(num, 1)

            step_groups = []
            colors = ["#38BDF8", "#818CF8", "#A855F7", "#10B981"]

            for i, step in enumerate(items):
                col = colors[i % len(colors)]
                label = Text(step, font_size=20, color=WHITE, weight=BOLD)
                num_tag = Text(f"#{i+1}", font_size=13, color=col).next_to(label, UP, buff=0.1)
                box = RoundedRectangle(corner_radius=0.2, height=1.3, width=2.4, color=col,
                                       fill_color="#0F172A", fill_opacity=0.9, stroke_width=2.5)
                step_groups.append(VGroup(box, label, num_tag))

            vg = VGroup(*step_groups).arrange(RIGHT, buff=0.8).shift(UP * 0.2)

            arrows = []
            for i in range(num - 1):
                arr = Arrow(step_groups[i].get_right(), step_groups[i+1].get_left(),
                            buff=0.08, color="#64748B", stroke_width=2.5, max_tip_length_to_length_ratio=0.25)
                arrows.append(arr)

            # Progressive animation sequence
            for i in range(num):
                anim_time = min(step_duration * 0.5, 0.7)
                self.play(FadeIn(step_groups[i], scale=0.85), run_time=anim_time)
                if i < len(arrows):
                    self.play(GrowArrow(arrows[i]), arrows[i].animate.set_color("#38BDF8"), run_time=anim_time * 0.6)
                
                # Active step pulse
                glow = SurroundingRectangle(step_groups[i], color="#FBBF24", buff=0.06, stroke_width=3)
                self.play(Create(glow), run_time=0.3)
                wait_time = max(0.1, step_duration - anim_time - 0.3)
                self.wait(wait_time)
                self.play(FadeOut(glow), run_time=0.2)

        def build_neural_network(self, data, total_time):
            layers_config = [3, 4, 2]
            layer_groups = []
            x_offsets = [-3.2, 0, 3.2]
            colors = ["#38BDF8", "#A855F7", "#10B981"]
            layer_names = ["Input Layer", "Hidden Layer", "Output Layer"]

            step_time = total_time / 4.0

            # 1. Build Layers
            for li, count in enumerate(layers_config):
                neurons = VGroup()
                for ni in range(count):
                    y_pos = (ni - (count - 1) / 2.0) * 1.05
                    circle = Circle(radius=0.25, color=colors[li], fill_color=colors[li], fill_opacity=0.85, stroke_width=2.5)
                    circle.move_to([x_offsets[li], y_pos + 0.15, 0])
                    neurons.add(circle)
                layer_groups.append(neurons)

            labels = VGroup(*[
                Text(layer_names[li], font_size=18, color=colors[li], weight=BOLD).next_to(layer_groups[li], UP, buff=0.3)
                for li in range(3)
            ])

            # Animate entrance of layers
            self.play(FadeIn(labels), run_time=step_time * 0.4)
            self.play(
                LaggedStart(*[FadeIn(g, scale=0.8) for g in layer_groups], lag_ratio=0.3),
                run_time=step_time * 0.6
            )

            # 2. Draw Synapses
            lines = VGroup()
            for l1, l2 in zip(layer_groups[:-1], layer_groups[1:]):
                for n1 in l1:
                    for n2 in l2:
                        lines.add(Line(n1.get_right(), n2.get_left(), stroke_width=1.2, color="#334155", stroke_opacity=0.6))
            self.play(Create(lines), run_time=step_time * 0.6)

            # 3. Continuous Synaptic Feedforward Pulses during narration
            flash_time = max(0.5, step_time * 0.8)
            pulses_1 = [ShowPassingFlash(Line(n1.get_right(), n2.get_left(), color="#38BDF8", stroke_width=3.5), time_width=0.4)
                        for n1 in layer_groups[0] for n2 in layer_groups[1][:2]]
            self.play(*pulses_1, run_time=flash_time)

            pulses_2 = [ShowPassingFlash(Line(n1.get_right(), n2.get_left(), color="#A855F7", stroke_width=3.5), time_width=0.4)
                        for n1 in layer_groups[1] for n2 in layer_groups[2]]
            self.play(*pulses_2, run_time=flash_time)

            # Highlight output neuron
            out_glow = SurroundingRectangle(layer_groups[2][0], color="#22C55E", buff=0.1, corner_radius=0.3)
            self.play(Create(out_glow), run_time=0.4)
            self.wait(max(0.1, total_time - self.time))

        def build_sorting(self, data, total_time):
            values = [45, 80, 25, 95, 60]
            bars = VGroup()
            num = len(values)
            step_time = total_time / 3.0

            for i, val in enumerate(values):
                h = val * 0.03
                bar = Rectangle(height=h, width=1.0, color="#38BDF8", fill_color="#0284C7", fill_opacity=0.85, stroke_width=2)
                lbl = Text(str(val), font_size=20, color=WHITE, weight=BOLD).next_to(bar, DOWN, buff=0.15)
                bars.add(VGroup(bar, lbl))

            bars.arrange(RIGHT, buff=0.5, aligned_edge=DOWN).shift(UP * 0.1)
            self.play(Create(bars), run_time=step_time * 0.6)

            # Swap 1
            b1 = bars[1]
            b2 = bars[2]
            p1 = b1.get_center()
            p2 = b2.get_center()
            self.play(b1[0].animate.set_color("#F59E0B"), b2[0].animate.set_color("#10B981"), run_time=0.4)
            self.play(b1.animate.move_to(p2), b2.animate.move_to(p1), run_time=step_time * 0.6)

            # Swap 2
            b3 = bars[3]
            b4 = bars[4]
            p3 = b3.get_center()
            p4 = b4.get_center()
            self.play(b3[0].animate.set_color("#F59E0B"), b4[0].animate.set_color("#10B981"), run_time=0.4)
            self.play(b3.animate.move_to(p4), b4.animate.move_to(p3), run_time=step_time * 0.6)

        def build_comparison(self, data, total_time):
            step_time = total_time / 3.0
            left_t = sanitize_text(data.get('left_title') or data.get('left', {}).get('title') or "Method A", 18)
            right_t = sanitize_text(data.get('right_title') or data.get('right', {}).get('title') or "Method B", 18)

            left_box = RoundedRectangle(corner_radius=0.25, height=3.6, width=4.5, color="#38BDF8",
                                        fill_color="#0B132B", fill_opacity=0.9, stroke_width=2.5)
            right_box = RoundedRectangle(corner_radius=0.25, height=3.6, width=4.5, color="#A855F7",
                                         fill_color="#1C0F2B", fill_opacity=0.9, stroke_width=2.5)
            boxes = VGroup(left_box, right_box).arrange(RIGHT, buff=1.2).shift(UP * 0.1)

            t1 = Text(left_t, font_size=24, color="#38BDF8", weight=BOLD).move_to(left_box.get_top() + DOWN * 0.45)
            t2 = Text(right_t, font_size=24, color="#A855F7", weight=BOLD).move_to(right_box.get_top() + DOWN * 0.45)

            self.play(FadeIn(boxes), Write(t1), Write(t2), run_time=step_time * 0.6)

            left_points = data.get('left', {}).get('points') or ["Intuitive & Easy", "Low Computation", "Direct Interpretation"]
            right_points = data.get('right', {}).get('points') or ["Scalable to Big Data", "Non-linear Modeling", "Higher Accuracy"]

            for i in range(min(len(left_points), len(right_points))):
                lp = Text(f"✓ {sanitize_text(left_points[i], 22)}", font_size=18, color="#E2E8F0").move_to(t1.get_bottom() + DOWN * (0.55 + i * 0.6))
                rp = Text(f"✦ {sanitize_text(right_points[i], 22)}", font_size=18, color="#E2E8F0").move_to(t2.get_bottom() + DOWN * (0.55 + i * 0.6))
                self.play(FadeIn(lp, shift=RIGHT * 0.2), FadeIn(rp, shift=LEFT * 0.2), run_time=step_time * 0.7)

        def build_timeline(self, data, total_time):
            events = [sanitize_text(e, 18) for e in (data.get('events') or ["Phase 1: Setup", "Phase 2: Train", "Phase 3: Deploy"])][:4]
            num = len(events)
            step_time = total_time / max(num, 1)

            axis = Line(LEFT * 5.2, RIGHT * 5.2, color="#475569", stroke_width=3.5).shift(UP * 0.15)
            self.play(Create(axis), run_time=0.5)

            for i, ev in enumerate(events):
                x = (i - (num - 1) / 2.0) * (9.5 / max(num - 1, 1))
                dot = Circle(radius=0.22, color="#38BDF8", fill_color="#0284C7", fill_opacity=1, stroke_width=2.5).move_to([x, 0.15, 0])
                num_tag = Text(str(i + 1), font_size=14, color=WHITE, weight=BOLD).move_to(dot.get_center())
                
                card_y = UP * 1.0 if i % 2 == 0 else DOWN * 1.0
                card_lbl = Text(ev, font_size=19, color=WHITE, weight=BOLD)
                card_box = RoundedRectangle(corner_radius=0.15, height=0.75, width=card_lbl.width + 0.4,
                                            color="#818CF8", fill_color="#1E1B4B", fill_opacity=0.9, stroke_width=1.5)
                card = VGroup(card_box, card_lbl).move_to([x, 0.15 + card_y[1], 0])

                connector = Line(dot.get_center(), card.get_center(), color="#64748B", stroke_width=1.5)

                self.play(FadeIn(dot), FadeIn(num_tag), Create(connector), FadeIn(card, shift=card_y * 0.2), run_time=step_time * 0.7)
                self.wait(max(0.1, step_time * 0.3))

        def build_flowchart(self, data, text_items, total_time):
            nodes = [sanitize_text(n, 20) for n in (text_items or ["Start", "Condition Check", "Execute Logic", "Result"])][:4]
            num = len(nodes)
            step_time = total_time / max(num, 1)

            box_group = []
            for i, n in enumerate(nodes):
                lbl = Text(n, font_size=20, color=WHITE, weight=BOLD)
                col = "#22C55E" if i == 0 else "#EAB308" if i == 1 else "#38BDF8" if i == 2 else "#A855F7"
                box = RoundedRectangle(corner_radius=0.2, height=0.95, width=3.4, color=col,
                                       fill_color="#0F172A", fill_opacity=0.9, stroke_width=2)
                box_group.append(VGroup(box, lbl))

            vg = VGroup(*box_group).arrange(DOWN, buff=0.55).shift(UP * 0.1)

            for i in range(num):
                self.play(FadeIn(box_group[i], shift=DOWN * 0.15), run_time=step_time * 0.5)
                if i < num - 1:
                    arr = Arrow(box_group[i].get_bottom(), box_group[i+1].get_top(), buff=0.08, color="#64748B", stroke_width=2.5)
                    self.play(GrowArrow(arr), run_time=step_time * 0.3)
                self.wait(max(0.1, step_time * 0.2))

        def build_architecture(self, data, total_time):
            step_time = total_time / 3.0
            
            # Client, Server, DB cards
            c_box = RoundedRectangle(corner_radius=0.2, height=1.6, width=2.6, color="#38BDF8", fill_color="#0F172A", fill_opacity=0.9, stroke_width=2)
            c_txt = Text("Client App", font_size=20, color="#38BDF8", weight=BOLD).move_to(c_box.get_center())
            client = VGroup(c_box, c_txt)

            s_box = RoundedRectangle(corner_radius=0.2, height=1.6, width=2.6, color="#A855F7", fill_color="#0F172A", fill_opacity=0.9, stroke_width=2)
            s_txt = Text("AI Engine", font_size=20, color="#A855F7", weight=BOLD).move_to(s_box.get_center())
            server = VGroup(s_box, s_txt)

            d_box = RoundedRectangle(corner_radius=0.2, height=1.6, width=2.6, color="#10B981", fill_color="#0F172A", fill_opacity=0.9, stroke_width=2)
            d_txt = Text("Knowledge DB", font_size=20, color="#10B981", weight=BOLD).move_to(d_box.get_center())
            database = VGroup(d_box, d_txt)

            arch_vg = VGroup(client, server, database).arrange(RIGHT, buff=1.4).shift(UP * 0.2)

            self.play(FadeIn(client), FadeIn(server), FadeIn(database), run_time=step_time * 0.6)

            # Flow arrows
            arr1 = Arrow(client.get_right(), server.get_left(), color="#38BDF8", buff=0.1, stroke_width=3)
            arr2 = Arrow(server.get_right(), database.get_left(), color="#A855F7", buff=0.1, stroke_width=3)

            self.play(GrowArrow(arr1), run_time=step_time * 0.4)
            self.play(GrowArrow(arr2), run_time=step_time * 0.4)
            self.wait(max(0.1, step_time))

        def build_formula(self, title, on_screen, total_time):
            step_time = total_time / 2.0
            
            box = RoundedRectangle(corner_radius=0.3, height=3.2, width=8.5, color="#38BDF8", fill_color="#030712", fill_opacity=0.9, stroke_width=2)
            box.shift(UP * 0.15)
            
            f_title = Text("Key Mathematical Formulation", font_size=22, color="#94A3B8", weight=BOLD).move_to(box.get_top() + DOWN * 0.4)
            
            eq_text = on_screen[0] if on_screen else title
            eq = Text(sanitize_text(eq_text, 36), font_size=32, color="#F8FAFC", weight=BOLD).move_to(box.get_center())
            
            self.play(Create(box), Write(f_title), run_time=step_time * 0.5)
            self.play(Write(eq), eq.animate.set_color("#38BDF8"), run_time=step_time * 0.7)

            if len(on_screen) > 1:
                sub_text = Text(sanitize_text(on_screen[1], 45), font_size=20, color="#A78BFA").move_to(box.get_bottom() + UP * 0.45)
                self.play(FadeIn(sub_text), run_time=step_time * 0.6)
            self.wait(max(0.1, total_time - self.time))

        def build_code(self, on_screen, total_time):
            step_time = total_time / 3.0
            
            box = RoundedRectangle(corner_radius=0.25, height=3.6, width=8.5, color="#64748B", fill_color="#0F172A", fill_opacity=0.95, stroke_width=2)
            box.shift(UP * 0.15)
            
            top_bar = Line(box.get_left() + UP * 1.3, box.get_right() + UP * 1.3, color="#334155", stroke_width=1.5)
            dot1 = Circle(radius=0.08, color="#EF4444", fill_color="#EF4444", fill_opacity=1).move_to(box.get_left() + UP * 1.5 + RIGHT * 0.4)
            dot2 = Circle(radius=0.08, color="#EAB308", fill_color="#EAB308", fill_opacity=1).move_to(dot1.get_right() + RIGHT * 0.25)
            dot3 = Circle(radius=0.08, color="#22C55E", fill_color="#22C55E", fill_opacity=1).move_to(dot2.get_right() + RIGHT * 0.25)
            
            self.play(Create(box), Create(top_bar), FadeIn(dot1), FadeIn(dot2), FadeIn(dot3), run_time=step_time * 0.5)

            lines_text = on_screen[:3] if on_screen else ["model = build_architecture()", "model.fit(X_train, y_train)", "accuracy = model.evaluate(X_test)"]
            code_vg = VGroup(*[
                Text(f"{idx+1}  {sanitize_text(lt, 38)}", font_size=20, color="#E2E8F0", font="Courier New", weight=NORMAL)
                for idx, lt in enumerate(lines_text)
            ]).arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to(box.get_center() + DOWN * 0.2)

            for line in code_vg:
                self.play(FadeIn(line, shift=RIGHT * 0.2), run_time=step_time * 0.5)
                high = SurroundingRectangle(line, color="#38BDF8", buff=0.05, stroke_width=2)
                self.play(Create(high), run_time=0.2)
                self.wait(0.3)
                self.play(FadeOut(high), run_time=0.2)

        def build_concept_map(self, title, kw_list, on_screen, steps, total_time):
            # Dynamic concept nucleus with sequentially branching satellites
            nucleus_title = sanitize_text(title, 20)
            nucleus_circle = Circle(radius=1.2, color="#38BDF8", fill_color="#0F172A", fill_opacity=0.92, stroke_width=3)
            nucleus_label = Text(nucleus_title, font_size=20, color=WHITE, weight=BOLD).move_to(nucleus_circle.get_center())
            nucleus = VGroup(nucleus_circle, nucleus_label).shift(UP * 0.15)

            self.play(FadeIn(nucleus, scale=0.7), run_time=0.6)

            items = [sanitize_text(it, 16) for it in (on_screen[:4] or kw_list[:4] or steps[:4] or ["Core Concept", "Key Feature", "Mechanism", "Application"])]
            num = len(items)
            step_time = (total_time - 0.6) / max(num, 1)

            angles = [np.pi / 4, 3 * np.pi / 4, 5 * np.pi / 4, 7 * np.pi / 4]
            colors = ["#38BDF8", "#A855F7", "#10B981", "#F59E0B"]

            for i, item in enumerate(items[:4]):
                ang = angles[i]
                pos = nucleus.get_center() + np.array([np.cos(ang) * 3.4, np.sin(ang) * 1.8, 0])
                col = colors[i % len(colors)]
                
                sat_box = RoundedRectangle(corner_radius=0.2, height=0.8, width=2.4,
                                           color=col, fill_color="#1E1B4B", fill_opacity=0.9, stroke_width=2)
                sat_txt = Text(item, font_size=17, color=WHITE, weight=SEMIBOLD).move_to(sat_box.get_center())
                satellite = VGroup(sat_box, sat_txt).move_to(pos)

                edge_nucleus = nucleus.get_edge_center(np.array([np.cos(ang), np.sin(ang), 0]))
                edge_sat = satellite.get_edge_center(np.array([-np.cos(ang), -np.sin(ang), 0]))
                line = Line(edge_nucleus, edge_sat, color="#64748B", stroke_width=2.5)

                self.play(Create(line), FadeIn(satellite, shift=np.array([np.cos(ang)*0.2, np.sin(ang)*0.2, 0])), run_time=step_time * 0.6)
                
                # Particle pulse from nucleus to satellite
                pulse = ShowPassingFlash(Line(edge_nucleus, edge_sat, color=col, stroke_width=4), time_width=0.4)
                self.play(pulse, run_time=step_time * 0.4)

    # Output paths & rendering execution with isolated unique temporary directories
    import time
    import uuid
    unique_tag = f"{os.getpid()}_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    temp_dir = os.path.join(os.path.dirname(output_mp4), f"temp_manim_{unique_tag}")
    os.makedirs(temp_dir, exist_ok=True)
    config.media_dir = temp_dir
    config.output_file = os.path.basename(output_mp4)

    try:
        scene = DynamicEducationalScene()
        scene.render()

        # Locate generated mp4 file
        found_file = None
        for root, dirs, files in os.walk(temp_dir):
            for f in files:
                if f.endswith('.mp4') and 'partial_movie_files' not in root:
                    found_file = os.path.join(root, f)
                    break
            if found_file:
                break

        if found_file and os.path.exists(found_file):
            os.makedirs(os.path.dirname(os.path.abspath(output_mp4)), exist_ok=True)
            shutil.copyfile(found_file, output_mp4)
            time.sleep(0.1)
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass
            return True
        return False
    except Exception as e:
        sys.stderr.write(f"Manim render exception: {str(e)}\n")
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: manimRenderer.py <scene.json> <output.mp4>"}))
        sys.exit(1)

    json_path = sys.argv[1]
    output_mp4 = sys.argv[2]

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            scene_data = json.load(f)

        success = render_scene_to_file(scene_data, output_mp4)
        print(json.dumps({"success": success, "output": output_mp4}))
        sys.exit(0 if success else 1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
