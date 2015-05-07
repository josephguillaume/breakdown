crossoverEquiconcern=function(equations.scen, equations.baseline, var, ranges,bounds="combn"){
  ranges=as.data.frame(ranges)
  stopifnot(all(c("Variable","Lower","Min","Best","Max","Upper") %in% names(ranges)))
  
  ## Get functions for each scenario
  f.scen=evalTermsFun(equations.scen,var,subset.args=FALSE)
  f.baseline=evalTermsFun(equations.baseline,var,subset.args=FALSE)
  netdiff <- createDiffFun(f.scen,f.baseline,ranges$Variable,fixed.vals=NULL)
  
  doutput=function(loc,bound){
    x=ifelse(bound<ranges$Best,
             bound+loc*(ranges$Best-bound)/100,
             bound-loc*(bound-ranges$Best)/100
    )
    netdiff(x)
  }
  ## All possible directions
  if(identical(bounds,"combn")) bounds<-do.call(expand.grid,lapply(apply(ranges[,c("Min","Max")],1,as.list),unlist))
  if(identical(bounds,"opt_max")) {
    dirs=guessDirectionMax(f.scen=f.scen,f.baseline=f.baseline,ranges=ranges)
    bounds=matrix(ifelse(dirs=="closer",ranges$Max,ifelse(cc=="further",ranges$Min,ranges$Best)),nrow=1)
  }
  if(identical(bounds,"opt_cor")) {
    cc=cor_kendall(f.scen=f.scen,f.baseline=f.baseline,ranges=ranges)
    if(any(cc!=1 & cc!=-1 & cc!=0)) stop("cor_kendall says function is not monotonic in all variables")
    # if current difference is positive, need to reduce difference; if negative, increase difference
    if(f.scen()-f.baseline()<0){ bounds=matrix(ifelse(cc==1,ranges$Max,ifelse(cc==-1,ranges$Min,ranges$Best)),nrow=1)
    } else {bounds=matrix(ifelse(cc==1,ranges$Min,ifelse(cc==-1,ranges$Max,ranges$Best)),nrow=1)}
  }
  ## Identify crossover point along each line of equal concern
  locs=apply(bounds,1,function(bound){
    res=tryCatch(uniroot(doutput,c(0,100),bound=bound)$root,error=function(e) NA)
  })
  if(all(is.na(locs))) stop("No crossover points found")
  ## Select point of greatest concern
  w.max.loc=which.max(locs)
  loc=locs[w.max.loc]
  bound=as.numeric(bounds[w.max.loc,])
  names(bound)<-ranges$Variable
  x=ifelse(bound<ranges$Best,
           bound+loc*(ranges$Best-bound)/100,
           bound-loc*(bound-ranges$Best)/100
  )
  names(x)<-ranges$Variable
  list(loc=loc,
       bound=bound,
       doutput=doutput(loc,bound=bound),
       values=x
  )
}
