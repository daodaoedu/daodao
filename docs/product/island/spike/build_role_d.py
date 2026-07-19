# 島島阿學 role-d（deep-explorer）泡泡角色建模腳本
# 用法: blender -b -P build_role_d.py -- <output_dir>
# 產出: role-d.glb（Body 與 Magnifier 兩個頂層節點）+ preview.png
import bpy
import math
import sys

out_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."

# ---------- 品牌色（daodao design tokens） ----------
def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_rgba(h, alpha=1.0):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), alpha)

AQUA = hex_rgba("#98ECFF")        # mascot.aqua
BRIGHT = hex_rgba("#4AE8FF")      # mascot.brightBlue（鏡片）
WHITE = hex_rgba("#FFFFFF")
BLACK = hex_rgba("#1F2937")
GRAY = hex_rgba("#6B7280")        # 鏡框
YELLOW = hex_rgba("#FACC15")      # 柄上黃環

def mat(name, rgba, rough=0.55, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
    return m

M_BODY = mat("body_aqua", AQUA)
M_EYE = mat("eye_white", WHITE, rough=0.35)
M_PUPIL = mat("pupil_black", BLACK, rough=0.4)
M_RIM = mat("glass_rim", GRAY, rough=0.5)
M_LENS = mat("lens", BRIGHT, rough=0.1, alpha=0.35)
M_HANDLE = mat("handle_black", BLACK, rough=0.5)
M_BAND = mat("handle_band", YELLOW, rough=0.5)

# ---------- 場景清空 ----------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

def add_sphere(name, r, loc, scale=(1, 1, 1), seg=32, ring=16, m=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if m:
        o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

def add_cone(name, r1, depth, loc, rot, m=None, verts=24):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=0.02, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if m:
        o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

def add_cyl(name, r, depth, loc, rot=(0, 0, 0), m=None, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if m:
        o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

# ---------- 本體（面朝 -Y） ----------
body = add_sphere("body_sphere", 1.0, (0, 0, 1.05), scale=(1.0, 0.95, 1.04), m=M_BODY)

# 尾巴：左下斜向外的圓錐，基部沒入球體、尖端明顯外露
tail = add_cone("tail", 0.34, 1.0, (-0.98, -0.12, 0.30),
                (0, math.radians(-125), math.radians(8)), m=M_BODY)

# 眼睛：長在右前側、看向放大鏡（如參考圖）＋瞳孔偏向視線方向
EYE_Z = 1.42
for side, azim in (("L", 16), ("R", 40)):
    a = math.radians(azim)
    ex, ey = 0.84 * math.sin(a), -0.84 * math.cos(a)
    add_sphere(f"eye_{side}", 0.17, (ex, ey, EYE_Z), scale=(1, 0.62, 1), m=M_EYE)
    px, py = 0.95 * math.sin(a + math.radians(4)), -0.95 * math.cos(a + math.radians(4))
    add_sphere(f"pupil_{side}", 0.072, (px, py, EYE_Z), scale=(1, 0.62, 1), m=M_PUPIL)

# 合併本體
for o in bpy.data.objects:
    o.select_set(o.name.startswith(("body_", "tail", "eye_", "pupil_")))
bpy.context.view_layer.objects.active = bpy.data.objects["body_sphere"]
bpy.ops.object.join()
bpy.context.object.name = "Body"

# ---------- 放大鏡（浮在角色右側，如參考圖） ----------
gx, gy, gz = 1.42, -0.42, 1.30          # 鏡心位置（懸浮於身側，不與球體相交）
rot_g = (math.radians(90), 0, math.radians(-20))
bpy.ops.mesh.primitive_torus_add(major_radius=0.26, minor_radius=0.05,
                                 major_segments=32, minor_segments=12,
                                 location=(gx, gy, gz), rotation=rot_g)
rim = bpy.context.object
rim.name = "glass_rim"
rim.data.materials.append(M_RIM)
bpy.ops.object.shade_smooth()

lens = add_cyl("lens", 0.23, 0.03, (gx, gy, gz), rot=rot_g, m=M_LENS, verts=32)

# 柄：黃環 + 黑柄，沿鏡框斜下方
hdir = math.radians(-20)
hx = gx + 0.42 * math.sin(hdir) * -1
hz = gz - 0.42
band = add_cyl("band", 0.06, 0.12, (gx - 0.12, gy, gz - 0.34),
               rot=(0, math.radians(20), 0), m=M_BAND)
handle = add_cyl("handle", 0.07, 0.34, (gx - 0.20, gy, gz - 0.55),
                 rot=(0, math.radians(20), 0), m=M_HANDLE)

for o in bpy.data.objects:
    o.select_set(o.name in ("glass_rim", "lens", "band", "handle"))
bpy.context.view_layer.objects.active = rim
bpy.ops.object.join()
bpy.context.object.name = "Magnifier"

# ---------- 匯出 GLB ----------
bpy.ops.object.select_all(action="SELECT")
glb_path = f"{out_dir}/role-d.glb"
bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True)
print(f"EXPORTED: {glb_path}")

# ---------- 渲染預覽圖 ----------
bpy.ops.object.camera_add(location=(2.6, -3.4, 2.1), rotation=(math.radians(72), 0, math.radians(37)))
cam = bpy.context.object
bpy.context.scene.camera = cam
bpy.ops.object.light_add(type="SUN", location=(3, -4, 6))
bpy.context.object.data.energy = 3.5
bpy.ops.object.light_add(type="AREA", location=(-3, -3, 3))
bpy.context.object.data.energy = 250

scene = bpy.context.scene
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.film_transparent = False
world = bpy.data.worlds["World"]
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.94, 0.95, 0.96, 1)
scene.render.filepath = f"{out_dir}/preview.png"
bpy.ops.render.render(write_still=True)
print("PREVIEW DONE")
