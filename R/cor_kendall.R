cor_kendall=function(equations.scen,equations.baseline,var,ranges,n=10,eps=1e-8){
  f.scen=evalTermsFun(equations.scen,var,subset.args=FALSE)
  f.baseline=evalTermsFun(equations.baseline,var,subset.args=FALSE)
  ranges=as.data.frame(ranges)
  f.diff=function(...) f.scen(...)-f.baseline(...)
  ccc=sapply(vars,function(v) {
    xs=seq(ranges$Lower[ranges$Variable==v],ranges$Upper[ranges$Variable==v],length.out=n)
    ys=sapply(xs,function(x) {
      x=list(x)
      names(x)=v
      do.call(f.diff,x)
    })
    if(all(abs(diff(range(ys)))<eps)) return(0)
    cor(xs,ys,method="kendall")
  })
}