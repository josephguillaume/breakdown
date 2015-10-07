## equations - matrix with first column as variable
## x - independent variable
## y - dependent variable
## ranges0 - list with variables Min,Max
## scens - vector of scenario names to use in plot
plotNPV<-function(equations,x,y,ranges0,scens,text_overlay=TRUE){
  fs=evalTermsFun(equations,y,subset.args=FALSE)
  
  stopifnot(length(fs)==length(scens))
  
  ## Use a list even for a single function
  if(is.function(fs)) fs=list(fs)
  if(is.null(ranges0[["Best"]])) ranges0[["Best"]]=formals(fs[[1]])[[x]]
  
  ## Template of the ggplot command
  tpl="
  ggplot()+
  geom_vline(aes(xintercept={MODELED},linetype='Best guess',size='Best guess',colour='Best guess',show_guide=TRUE))+
  geom_hline(aes(yintercept=0),colour='grey',size=1,linetype='solid')+
  scale_x_continuous(name=x,limits=range(c({LOWER},{UPPER})))+
  scale_y_continuous(name='{YVAR}')+
  scale_linetype_manual(name='Lines',values=c('Limits'='solid','Best guess'='dashed',{LINETYPE}),
  limits=c('Best guess','Limits',{SCENS}))+
  scale_size_manual(name='Lines',values=c('Limits'=0.5,'Best guess'=0.5,{SIZE}),
  limits=c('Best guess','Limits',{SCENS}))+
  scale_colour_manual(name='Lines',values=c('Limits'='black','Best guess'='black',{COLOUR}),
  limits=c('Best guess','Limits',{SCENS}))"
  ## Replace values
  ## TODO: should throw error if doesn't have same value for each function
  tpl=gsub("{MODELED}",ranges0[["Best"]],tpl,fixed=TRUE)
  tpl=gsub("{LOWER}",ranges0[["Lower"]],tpl,fixed=TRUE)
  tpl=gsub("{UPPER}",ranges0[["Upper"]],tpl,fixed=TRUE)
  tpl=gsub("{YVAR}",y,tpl,fixed=TRUE)
  if(!is.null(ranges0[["Min"]]) && !is.null(ranges0[["Max"]])){
    tpl=paste(tpl,"+geom_vline(aes(xintercept=c({MIN},{MAX}),linetype='Limits',size='Limits',colour='Limits'))")
    tpl=gsub("{MIN}",ranges0[["Min"]],tpl,fixed=TRUE)
    tpl=gsub("{MAX}",ranges0[["Max"]],tpl,fixed=TRUE)
  }
  tpl=gsub("{LINETYPE}",paste(sprintf("'%s'='solid'",scens),collapse=","),tpl,fixed=TRUE)
  tpl=gsub("{SIZE}",paste(sprintf("'%s'=1",scens),collapse=","),tpl,fixed=TRUE)
  tpl=gsub("{COLOUR}",paste(sprintf("'%s'='%s'",scens,scales::hue_pal()(length(scens))),collapse=","),tpl,fixed=TRUE)
  tpl=gsub("{SCENS}",paste(sprintf("'%s'",scens),collapse=","),tpl,fixed=TRUE)
  ## Add functions to evaluate
  for(i in 1:length(scens)){
    scen.name=scens[i]
    tpl=sprintf("%s+
                stat_function(fun=function(x){
                    sapply(x,function(x2) fs[[%d]](%s=x2))
                },aes(linetype='%s',size='%s',colour='%s'))",tpl,i,x,scen.name,scen.name,scen.name)
  }
  
  p=eval(parse(text=tpl))
  
  ##Add background showing best alternative if there are only two equations
  if(text_overlay && length(fs)==2){
    
    #Calculate crossover
    crossover=univariateCrossover(fs[[1]],fs[[2]],ranges=ranges0)
    
    if(!is.na(crossover)){
      crossover.y=eval(parse(text=sprintf("fs[[1]](%s=%f)",x,crossover)))
      left.highest=which.max(eval(parse(text=sprintf("sapply(1:2,function(i) fs[[i]](%s=%f))",
                                                     x,crossover-0.01*(ranges0$Upper-ranges0$Lower)))))
      right.highest=which.max(eval(parse(text=sprintf("sapply(1:2,function(i) fs[[i]](%s=%f))",
                                                      x,crossover+0.01*(ranges0$Upper-ranges0$Lower)))))
      
      #Add to plot
      p=p+annotate("text",x=crossover,y=crossover.y,label=sprintf("%s is higher", scens[left.highest]),
                 hjust=1.1,vjust=0.5,color="grey50",size=4)+
        annotate("text",x=crossover,y=crossover.y,label=sprintf("%s is higher", scens[right.highest]),
                 hjust=-0.1,vjust=0.5,color="grey50",size=4)+
        geom_vline(xintercept=crossover,color="grey50",linetype="dotted")
      
      
      # Alternative: align above bottom axis
      #     p+annotate("text",x=crossover,y=0,label=sprintf("%s is higher", scens[1]),hjust=-0.1,vjust=-0.5)+
      #     annotate("text",x=crossover,y=0,label=sprintf("%s is higher", scens[2]),hjust=1.1,vjust=-0.5)
    }
  }
  return(p)
}
