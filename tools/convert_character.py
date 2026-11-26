import bpy, sys, os, json
base='/tmp/claude-0/-home-user/f40cd42b-4a07-5073-8ffa-a57d806934a0/scratchpad/'
char=base+'dl/character.fbx'
anims=json.loads(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else {}
out=base+'out/'+os.environ.get('OUT','character.glb')
os.makedirs(base+'out',exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=char)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
meshes=[o for o in bpy.data.objects if o.type=='MESH']
print('ARM',arm.name,len(arm.data.bones),'MESHES',[(m.name,len(m.data.vertices)) for m in meshes])
for m in bpy.data.materials:
    print('MAT',m.name,[n.type+':'+(n.image.name if n.type=='TEX_IMAGE' and n.image else '') for n in m.node_tree.nodes])
for im in bpy.data.images:
    print('IMG',im.name,im.size[:])

# уменьшаем текстуры
MAX=int(os.environ.get('TEX_MAX','1024'))
for im in bpy.data.images:
    if im.size[0]>MAX:
        im.scale(MAX,MAX)

# убираем ненужные карты (emissive/specular/glossiness), оставляем base color + normal
for m in bpy.data.materials:
    nt=m.node_tree
    for n in list(nt.nodes):
        if n.type=='TEX_IMAGE' and n.image:
            nm=n.image.name.lower()
            if any(k in nm for k in ('emissive','specular','glossiness')):
                for l in list(n.outputs[0].links):nt.links.remove(l)
                nt.nodes.remove(n)
    pb=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED']
    if pb:
        pb[0].inputs['Roughness'].default_value=0.45
        pb[0].inputs['Metallic'].default_value=0.0
        for k in ('Emission Strength',):
            if k in pb[0].inputs:pb[0].inputs[k].default_value=0.0

# анимации: загружаем каждую FBX, действие переносим на скелет персонажа
actions={}
for name,path in anims.items():
    before=set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new=[o for o in bpy.data.objects if o not in before]
    a_arm=[o for o in new if o.type=='ARMATURE'][0]
    act=a_arm.animation_data.action
    act.name=name
    print('ANIM',name,act.frame_range[:],len(act.fcurves) if hasattr(act,'fcurves') else '')
    actions[name]=act
    for o in new:bpy.data.objects.remove(o,do_unlink=True)
if arm.animation_data is None:arm.animation_data_create()
for name,act in actions.items():
    act.use_fake_user=True
    tr=arm.animation_data.nla_tracks.new();tr.name=name
    st=tr.strips.new(name,int(act.frame_range[0]),act)
    st.name=name
arm.animation_data.action=None
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_image_format='JPEG',export_jpeg_quality=int(os.environ.get('JPEG_Q','82')),
    export_animations=True,export_animation_mode='NLA_TRACKS',export_apply=False,export_yup=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_skins=True)
print('SIZE',os.path.getsize(out))
