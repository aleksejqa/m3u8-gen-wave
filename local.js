
fetch('http://hls.sweet.tv/stream/4khzssyqmr3megdr4vm8ssyj2atthreuh43fqa5zez65kwdj9zz4w5p9346ztc258vjg62gdz4gavyuadk3f7g6f5zhwcknptxw4k45pgwufvsr4paue4drt46iipxvbe6======').then(r => r.blob()).then(r => r.text()).then(html => {
    const a = [...html.matchAll(/RESOLUTION=(\w+),/gm)].map(a => a[1]);
    console.log(a)
})
