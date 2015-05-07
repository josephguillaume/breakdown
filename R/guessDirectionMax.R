guessDirectionMax=function(equations.scen,equations.baseline,var,ranges,eps=1e-8,
                           f.scen=NULL,f.baseline=NULL){
  if(is.null(f.scen)) f.scen=evalTermsFun(equations.scen,var,subset.args=FALSE)
  if(is.null(f.baseline)) f.baseline=evalTermsFun(equations.baseline,var,subset.args=FALSE)
  ranges=as.data.frame(ranges)
  f.diff=function(...) f.scen(...)-f.baseline(...)
  origy=f.diff()
  ccc=sapply(ranges$Variable,function(v) {
    origx=ranges$Best[ranges$Variable==v]
    maxx=ranges$Upper[ranges$Variable==v]
    stopifnot(maxx>origx)
    x=list(maxx)
    names(x)=v
    maxy = do.call(f.diff,x)
    if(abs(maxy - origy)<eps) { return("no effect")
    } else if (abs(maxy) >= abs(origy)) { return("further")
    } else { return("closer") }
  })
  return(ccc)
}